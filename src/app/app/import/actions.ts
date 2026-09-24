"use server";

import Papa from "papaparse";
import { revalidatePath } from "next/cache";
import { writeContext } from "@/lib/action-context";
import { getMembers } from "@/lib/queries";
import * as M from "@/lib/import-map";

export interface ParsedSheet {
  sheets: string[];
  sheet: string;
  headerRow: number;
  headers: string[];
  rows: string[][];
  total: number;
  error?: string;
}

const MAX_ROWS = 5000;

function cellText(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? "" : v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if ("result" in o) return cellText(o.result);
    if ("richText" in o && Array.isArray(o.richText)) return (o.richText as { text: string }[]).map((r) => r.text).join("");
    if ("text" in o) return cellText(o.text);
    if ("error" in o) return "";
    return "";
  }
  return String(v).trim();
}

function pickHeaderRow(grid: string[][]) {
  let best = 0;
  let bestCount = -1;
  grid.slice(0, 15).forEach((row, i) => {
    const count = row.filter((c) => c && /[a-z]/i.test(c) && c.length < 80).length;
    if (count > bestCount) {
      best = i;
      bestCount = count;
    }
  });
  return best;
}

export async function parseImportFile(fd: FormData): Promise<ParsedSheet> {
  await writeContext();
  const file = fd.get("file");
  const wanted = String(fd.get("sheet") ?? "");
  const headerOverride = Number(fd.get("header_row") ?? 0);
  if (!(file instanceof File) || !file.size) return { sheets: [], sheet: "", headerRow: 0, headers: [], rows: [], total: 0, error: "Choose a file first." };
  if (file.size > 9 * 1024 * 1024) return { sheets: [], sheet: "", headerRow: 0, headers: [], rows: [], total: 0, error: "Files up to 9 MB are supported." };

  let grid: string[][] = [];
  let sheets: string[] = [];
  let sheet = "";
  const name = file.name.toLowerCase();
  try {
    if (name.endsWith(".csv") || name.endsWith(".txt")) {
      const text = await file.text();
      const res = Papa.parse<string[]>(text, { skipEmptyLines: true });
      grid = res.data.map((r) => r.map((c) => String(c ?? "").trim()));
      sheets = ["CSV"];
      sheet = "CSV";
    } else {
      const ExcelJS = (await import("exceljs")).default;
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(Buffer.from(await file.arrayBuffer()) as unknown as ArrayBuffer);
      sheets = wb.worksheets.filter((w) => w.state !== "hidden" && w.state !== "veryHidden").map((w) => w.name);
      const ws = wb.worksheets.find((w) => w.name === wanted) ?? wb.worksheets.find((w) => sheets.includes(w.name))!;
      sheet = ws.name;
      const maxCol = Math.min(ws.columnCount || 60, 80);
      ws.eachRow({ includeEmpty: true }, (row, rowNumber) => {
        if (rowNumber > MAX_ROWS + 20) return;
        const out: string[] = [];
        for (let c = 1; c <= maxCol; c++) out.push(cellText(row.getCell(c).value));
        grid[rowNumber - 1] = out;
      });
      grid = Array.from(grid, (r) => r ?? []);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      sheets: [],
      sheet: "",
      headerRow: 0,
      headers: [],
      rows: [],
      total: 0,
      error: /encrypt|password|zip/i.test(msg)
        ? "This file is encrypted or protected (for example by a sensitivity label). Save an unprotected copy and try again."
        : `Couldn't read this file: ${msg}`,
    };
  }

  const headerRow = headerOverride > 0 ? headerOverride - 1 : pickHeaderRow(grid);
  const rawHeaders = grid[headerRow] ?? [];
  let lastCol = rawHeaders.length - 1;
  while (lastCol >= 0 && !rawHeaders[lastCol]) lastCol--;
  const headers = rawHeaders.slice(0, lastCol + 1).map((h, i) => h || `Column ${i + 1}`);
  const rows = grid
    .slice(headerRow + 1)
    .map((r) => headers.map((_, i) => r[i] ?? ""))
    .filter((r) => r.some((c) => c));
  return { sheets, sheet, headerRow: headerRow + 1, headers, rows: rows.slice(0, MAX_ROWS), total: rows.length };
}

export interface ImportResult { created: number; skipped: number; extra?: string; error?: string }

export async function runImport(target: M.ImportTarget, mapping: Record<string, number | null>, rows: string[][]): Promise<ImportResult> {
  const ws = await writeContext(target === "backlog" ? "portfolio" : target === "people" ? "resources" : undefined);
  const db = ws.supabase;
  const org = ws.org.id;
  const bp = ws.blueprint;
  const get = (r: string[], k: string) => {
    const i = mapping[k];
    if (i === null || i === undefined || i < 0) return null;
    const v = (r[i] ?? "").trim();
    return v === "" ? null : v;
  };
  const titleKey = target === "projects" || target === "people" ? "name" : "title";
  const usable = rows.slice(0, MAX_ROWS).filter((r) => get(r, titleKey));
  const skipped = rows.length - usable.length;
  if (!usable.length) return { created: 0, skipped, error: `No rows have a ${titleKey}. Check the column mapping.` };

  const chunks = <T,>(arr: T[], n = 500) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

  if (target === "people") {
    const records = usable.map((r) => ({
      organization_id: org,
      name: get(r, "name")!.slice(0, 200),
      discipline: M.matchByLabel(bp.disciplines, get(r, "discipline")),
      role_title: get(r, "discipline"),
      employment_type: M.employmentType(get(r, "employment_type") ?? get(r, "discipline")),
      capacity_hours_per_quarter: M.toNumber(get(r, "capacity")) ?? bp.capacityPerQuarter,
      email: get(r, "email"),
      notes: get(r, "notes"),
    }));
    for (const c of chunks(records)) {
      const { error } = await db.from("people").insert(c);
      if (error) return { created: 0, skipped, error: error.message };
    }
    revalidatePath("/app", "layout");
    return { created: records.length, skipped };
  }

  if (target === "projects") {
    const records = usable.map((r) => ({
      organization_id: org,
      name: get(r, "name")!.replace(/\s+/g, " ").slice(0, 300),
      code: get(r, "code")?.slice(0, 40) ?? null,
      category: get(r, "category"),
      site: get(r, "site"),
      decision: M.decision(get(r, "decision")),
      status: M.projectStatus(get(r, "status")) ?? "active",
      health: M.health(get(r, "health")) ?? "on_track",
      owner_label: get(r, "owner_label"),
      start_date: M.toDate(get(r, "start_date")),
      end_date: M.toDate(get(r, "end_date")),
      budget_original: M.toNumber(get(r, "budget_original")),
      budget_current: M.toNumber(get(r, "budget_current")),
      committed_quarter: M.quarterKey(get(r, "committed_quarter")),
      scope: get(r, "scope"),
      reference_links: get(r, "reference_links"),
      description: get(r, "description"),
      methodology: bp.methodology,
    }));
    for (const c of chunks(records)) {
      const { error } = await db.from("projects").insert(c);
      if (error) return { created: 0, skipped, error: error.message };
    }
    revalidatePath("/app", "layout");
    return { created: records.length, skipped };
  }

  if (target === "backlog") {
    const withNotes: { idx: number; notes: string }[] = [];
    const records = usable.map((r, idx) => {
      const scores: Record<string, number> = {};
      for (const c of bp.scoring.criteria) {
        const v = M.toNumber(get(r, `score_${c.key}`));
        if (v !== null && v >= 1 && v <= bp.scoring.scale) scores[c.key] = Math.round(v);
      }
      const notes = get(r, "notes");
      if (notes) withNotes.push({ idx, notes });
      const cp = M.committedPriority(get(r, "committed_priority"));
      return {
        organization_id: org,
        title: get(r, "title")!.replace(/\s+/g, " ").slice(0, 300),
        description: get(r, "description"),
        justification: get(r, "justification"),
        requestor_name: get(r, "requestor_name"),
        requestor_role: get(r, "requestor_role"),
        source: M.source(get(r, "source")) ?? "internal",
        pillar: get(r, "pillar"),
        category: get(r, "category"),
        site: get(r, "site"),
        business_impact: M.impact(get(r, "business_impact")),
        target_quarter: M.quarterKey(get(r, "target_quarter")),
        status: M.backlogStatus(get(r, "status")) ?? "new",
        rag: M.rag(get(r, "rag")),
        committed_priority: cp,
        committed_quarter: M.quarterKey(get(r, "committed_quarter")),
        planned_start: M.toDate(get(r, "planned_start")),
        planned_end: M.toDate(get(r, "planned_end")),
        percent_complete: M.toPercent(get(r, "percent_complete")) ?? 0,
        dependencies: get(r, "dependencies"),
        suggested_solution: get(r, "suggested_solution"),
        suggested_owner: get(r, "suggested_owner"),
        external_link: get(r, "external_link"),
        scores,
        ready_for_prioritization: Object.keys(scores).length > 0,
      };
    });
    const ids: string[] = [];
    for (const c of chunks(records)) {
      const { data, error } = await db.from("backlog_items").insert(c).select("id");
      if (error) return { created: ids.length, skipped, error: error.message };
      ids.push(...(data ?? []).map((d) => d.id));
    }
    if (withNotes.length) {
      await db.from("item_updates").insert(withNotes.filter((n) => ids[n.idx]).map((n) => ({ organization_id: org, backlog_item_id: ids[n.idx], body: n.notes.slice(0, 10000) })));
    }
    revalidatePath("/app", "layout");
    return { created: ids.length, skipped, extra: withNotes.length ? `${withNotes.length} notes added as dated updates.` : undefined };
  }

  // Tasks: resolve projects, phases and assignees by name.
  const members = await getMembers(ws);
  const { data: existingProjects } = await db.from("projects").select("id, name").eq("organization_id", org);
  const projectIds = new Map<string, string>((existingProjects ?? []).map((p) => [p.name.trim().toLowerCase(), p.id]));
  const newProjectNames = [...new Set(usable.map((r) => get(r, "project")?.replace(/\s+/g, " ").trim()).filter((n): n is string => Boolean(n)))].filter(
    (n) => !projectIds.has(n.toLowerCase()),
  );
  let createdProjects = 0;
  if (newProjectNames.length) {
    const { data, error } = await db
      .from("projects")
      .insert(newProjectNames.map((name) => ({ organization_id: org, name: name.slice(0, 300), methodology: bp.methodology, status: "active", health: "on_track" })))
      .select("id, name");
    if (error) return { created: 0, skipped, error: error.message };
    (data ?? []).forEach((p) => projectIds.set(p.name.trim().toLowerCase(), p.id));
    createdProjects = data?.length ?? 0;
  }
  const phaseIds = new Map<string, string>();
  const phasePairs = [...new Set(usable.map((r) => (get(r, "project") && get(r, "phase") ? `${get(r, "project")!.replace(/\s+/g, " ").trim().toLowerCase()}|||${get(r, "phase")!.trim()}` : null)).filter(Boolean))] as string[];
  if (phasePairs.length) {
    const pids = [...new Set(phasePairs.map((p) => projectIds.get(p.split("|||")[0]!)).filter(Boolean))] as string[];
    const { data: existing } = await db.from("phases").select("id, name, project_id").in("project_id", pids);
    (existing ?? []).forEach((ph) => phaseIds.set(`${ph.project_id}|||${ph.name.toLowerCase()}`, ph.id));
    const missing = phasePairs
      .map((p) => ({ project_id: projectIds.get(p.split("|||")[0]!)!, name: p.split("|||")[1]! }))
      .filter((p) => p.project_id && !phaseIds.has(`${p.project_id}|||${p.name.toLowerCase()}`));
    if (missing.length) {
      const { data } = await db.from("phases").insert(missing.map((m, i) => ({ organization_id: org, project_id: m.project_id, name: m.name, position: i }))).select("id, name, project_id");
      (data ?? []).forEach((ph) => phaseIds.set(`${ph.project_id}|||${ph.name.toLowerCase()}`, ph.id));
    }
  }
  const findMember = (v: string | null) => {
    if (!v) return null;
    const first = v.split(/[;,]/)[0]!.trim().toLowerCase();
    return members.find((m) => m.email.toLowerCase() === first || m.name.toLowerCase() === first)?.user_id ?? null;
  };
  const records = usable.map((r, i) => {
    const projectName = get(r, "project")?.replace(/\s+/g, " ").trim().toLowerCase() ?? null;
    const project_id = projectName ? projectIds.get(projectName) ?? null : null;
    const phaseName = get(r, "phase");
    const status = M.taskStatus(get(r, "status")) ?? "not_started";
    const completed = M.toDate(get(r, "completed_date"));
    const est = M.toNumber(get(r, "estimate_hours"));
    return {
      organization_id: org,
      project_id,
      phase_id: project_id && phaseName ? phaseIds.get(`${project_id}|||${phaseName.toLowerCase()}`) ?? null : null,
      title: get(r, "title")!.slice(0, 500),
      description: get(r, "description"),
      status,
      priority: M.priority(get(r, "priority")) ?? "medium",
      bucket: M.bucket(get(r, "bucket")),
      assignee_id: findMember(get(r, "assignee")),
      start_date: M.toDate(get(r, "start_date")),
      due_date: M.toDate(get(r, "due_date")),
      completed_at: status === "completed" && completed ? `${completed}T12:00:00Z` : null,
      estimate_hours: est !== null && est >= 0 && est < 100000 ? est : null,
      resource_type: M.matchByLabel(bp.disciplines, get(r, "resource_type")),
      percent_complete: status === "completed" ? 100 : M.toPercent(get(r, "percent_complete")) ?? 0,
      checklist: M.list(get(r, "checklist")).map((text) => ({ text, done: status === "completed" })),
      labels: M.list(get(r, "labels")),
      reference: get(r, "reference"),
      position: i,
    };
  });
  let created = 0;
  for (const c of chunks(records)) {
    const { error } = await db.from("tasks").insert(c);
    if (error) return { created, skipped, error: error.message };
    created += c.length;
  }
  revalidatePath("/app", "layout");
  const unmatched = usable.filter((r) => get(r, "assignee") && !findMember(get(r, "assignee"))).length;
  return {
    created,
    skipped,
    extra: [createdProjects ? `${createdProjects} projects created from the project column.` : "", unmatched ? `${unmatched} assignees didn't match a member and were left unassigned.` : ""].filter(Boolean).join(" ") || undefined,
  };
}
