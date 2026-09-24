// Field definitions, header auto-matching and value normalisation for the
// Excel/CSV/Planner importer. Pure functions: safe on client and server.

export type ImportTarget = "tasks" | "backlog" | "projects" | "people";

export interface FieldDef { key: string; label: string; required?: boolean; synonyms: string[] }

export const TARGETS: { key: ImportTarget; label: string; hint: string }[] = [
  { key: "tasks", label: "Tasks", hint: "Task trackers, MS Planner exports, to-do lists" },
  { key: "backlog", label: "Backlog requests", hint: "Intake logs, wish lists, sprint plans" },
  { key: "projects", label: "Projects", hint: "Project lists, master programmes, charters" },
  { key: "people", label: "People", hint: "Resource registers with disciplines and capacity" },
];

export const FIELDS: Record<ImportTarget, FieldDef[]> = {
  tasks: [
    { key: "title", label: "Title", required: true, synonyms: ["taskname", "task", "title", "name", "subject"] },
    { key: "project", label: "Project (by name)", synonyms: ["goal", "project", "plan", "list", "epic"] },
    { key: "phase", label: "Phase (by name)", synonyms: ["phase", "stage", "section"] },
    { key: "status", label: "Status", synonyms: ["status", "progress", "state"] },
    { key: "priority", label: "Priority", synonyms: ["priority"] },
    { key: "bucket", label: "Eisenhower bucket", synonyms: ["bucket", "quadrant", "eisenhower"] },
    { key: "assignee", label: "Assignee (name or email)", synonyms: ["assignedto", "assignee", "owner", "responsible"] },
    { key: "start_date", label: "Start date", synonyms: ["startdate", "start", "begin"] },
    { key: "due_date", label: "Due date", synonyms: ["duedateclean", "duedate", "due", "finish", "deadline", "enddate"] },
    { key: "completed_date", label: "Completed date", synonyms: ["completeddateclean", "completeddate", "completedon", "closedate"] },
    { key: "description", label: "Description", synonyms: ["details", "description", "notes", "extradetails"] },
    { key: "estimate_hours", label: "Estimated hours", synonyms: ["hoursrequired", "estimatedhours", "hours", "effort", "estimate"] },
    { key: "resource_type", label: "Discipline", synonyms: ["discipline", "resourcetype", "role"] },
    { key: "percent_complete", label: "% complete", synonyms: ["completion", "percentcomplete", "complete"] },
    { key: "checklist", label: "Checklist (separated by ;)", synonyms: ["checklistitems", "checklist"] },
    { key: "labels", label: "Labels (separated by ;)", synonyms: ["labels", "tags"] },
    { key: "reference", label: "Reference", synonyms: ["reference", "link", "url"] },
  ],
  backlog: [
    { key: "title", label: "Title", required: true, synonyms: ["title", "request", "name", "project"] },
    { key: "description", label: "Description", synonyms: ["description", "details"] },
    { key: "justification", label: "Justification", synonyms: ["justification", "reason", "why"] },
    { key: "requestor_name", label: "Requestor", synonyms: ["requestor", "requester", "raisedby"] },
    { key: "requestor_role", label: "Requestor role", synonyms: ["requestorrole", "role"] },
    { key: "source", label: "Source", synonyms: ["intakesource", "source"] },
    { key: "pillar", label: "Pillar", synonyms: ["pillar"] },
    { key: "category", label: "Category", synonyms: ["category", "area", "racicearea"] },
    { key: "site", label: "Site", synonyms: ["campus", "site", "location"] },
    { key: "business_impact", label: "Business impact", synonyms: ["businessimpact", "impact"] },
    { key: "target_quarter", label: "Target quarter", synonyms: ["targetsprint", "targetquarter", "target"] },
    { key: "status", label: "Status", synonyms: ["status"] },
    { key: "rag", label: "RAG / risk", synonyms: ["rag", "risk"] },
    { key: "committed_priority", label: "Committed priority (1–4)", synonyms: ["committedpriority", "priorityfinal"] },
    { key: "committed_quarter", label: "Committed quarter", synonyms: ["committedsprint", "committedquarter"] },
    { key: "planned_start", label: "Planned start", synonyms: ["plannedstart", "startdate", "start"] },
    { key: "planned_end", label: "Planned end", synonyms: ["plannedend", "enddate", "end"] },
    { key: "percent_complete", label: "% complete", synonyms: ["complete", "percentcomplete"] },
    { key: "dependencies", label: "Dependencies", synonyms: ["dependencies"] },
    { key: "suggested_solution", label: "Suggested solution", synonyms: ["suggestedsolution", "solution"] },
    { key: "suggested_owner", label: "Suggested owner", synonyms: ["suggestedowner", "cepmlead", "owner"] },
    { key: "external_link", label: "External link", synonyms: ["adolink", "link", "externallink", "url"] },
    { key: "notes", label: "Notes (become a dated update)", synonyms: ["notes", "comments", "update"] },
  ],
  projects: [
    { key: "name", label: "Name", required: true, synonyms: ["project", "name", "projecttitle", "title"] },
    { key: "code", label: "Code / ID", synonyms: ["code", "projectid", "id", "priority"] },
    { key: "category", label: "Category", synonyms: ["costcategory", "category"] },
    { key: "site", label: "Site", synonyms: ["campus", "site", "location"] },
    { key: "decision", label: "Decision", synonyms: ["decision"] },
    { key: "status", label: "Status", synonyms: ["status"] },
    { key: "health", label: "Health", synonyms: ["health", "goalstatus", "rag"] },
    { key: "owner_label", label: "Owner", synonyms: ["owner"] },
    { key: "start_date", label: "Start date", synonyms: ["startdate", "start"] },
    { key: "end_date", label: "End date", synonyms: ["enddate", "end", "finish"] },
    { key: "budget_original", label: "Original budget", synonyms: ["initialbudget", "originalbudget", "budget"] },
    { key: "budget_current", label: "Current budget / forecast", synonyms: ["newbudget", "forecast", "currentbudget"] },
    { key: "committed_quarter", label: "Committed quarter", synonyms: ["committedsprint", "quarter"] },
    { key: "scope", label: "Scope", synonyms: ["workscope", "scope"] },
    { key: "reference_links", label: "Reference links", synonyms: ["adolink", "referencelinks", "reference", "link"] },
    { key: "description", label: "Comments / description", synonyms: ["comments", "description", "notes"] },
  ],
  people: [
    { key: "name", label: "Name", required: true, synonyms: ["name", "person", "resource"] },
    { key: "discipline", label: "Discipline", synonyms: ["rolefunction", "discipline", "role", "category"] },
    { key: "employment_type", label: "Type (employee, contractor…)", synonyms: ["type", "employmenttype", "contract"] },
    { key: "capacity", label: "Hours per quarter", synonyms: ["q1hrscap", "capacity", "hoursperquarter", "hrscap"] },
    { key: "email", label: "Email", synonyms: ["email", "mail"] },
    { key: "notes", label: "Notes", synonyms: ["currentassignmentsnotes", "notes", "assignments"] },
  ],
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Best column for each field, by exact or partial header match. */
export function autoMap(target: ImportTarget, headers: string[], extra: FieldDef[] = []): Record<string, number | null> {
  const fields = [...FIELDS[target], ...extra];
  const nh = headers.map(norm);
  const used = new Set<number>();
  const out: Record<string, number | null> = {};
  for (const f of fields) {
    let best: number | null = null;
    for (const syn of f.synonyms) {
      const exact = nh.findIndex((h, i) => !used.has(i) && h === syn);
      if (exact >= 0) { best = exact; break; }
    }
    if (best === null) {
      for (const syn of f.synonyms) {
        const partial = nh.findIndex((h, i) => !used.has(i) && h.length > 1 && (h.startsWith(syn) || (syn.length >= 5 && h.includes(syn))));
        if (partial >= 0) { best = partial; break; }
      }
    }
    if (best !== null) used.add(best);
    out[f.key] = best;
  }
  return out;
}

export function scoreFields(criteria: { key: string; label: string }[]): FieldDef[] {
  return criteria.map((c) => ({ key: `score_${c.key}`, label: `Score: ${c.label}`, synonyms: [norm(c.label)] }));
}

// ---- value normalisation ----------------------------------------------------

const lc = (v: string) => v.trim().toLowerCase();

export function toDate(v: string | null | undefined): string | null {
  if (!v) return null;
  const s = v.trim();
  if (!s || s === "N/A" || s === "n/a") return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  if (/^\d{5}(\.\d+)?$/.test(s)) {
    const d = new Date(Math.round((Number(s) - 25569) * 86_400_000));
    return d.toISOString().slice(0, 10);
  }
  const dmy = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/.exec(s);
  if (dmy) {
    const [, a, b, y] = dmy;
    let day = Number(a);
    let month = Number(b);
    if (month > 12 && day <= 12) [day, month] = [month, day]; // US order
    const year = Number(y!.length === 2 ? `20${y}` : y);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

export function toNumber(v: string | null | undefined): number | null {
  if (!v) return null;
  const s = v.replace(/[€$£\s]/g, "").replace(/,(?=\d{3}\b)/g, "");
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function toPercent(v: string | null | undefined): number | null {
  const n = toNumber(v?.replace("%", ""));
  if (n === null) return null;
  return Math.max(0, Math.min(100, Math.round(n <= 1 && !v?.includes("%") ? n * 100 : n)));
}

export function taskStatus(v: string | null | undefined): string | null {
  if (!v) return null;
  const s = lc(v);
  if (/(complete|done|closed|finished)/.test(s)) return "completed";
  if (/cancel/.test(s)) return "cancelled";
  if (/block/.test(s)) return "blocked";
  if (/delay|late|behind/.test(s)) return "delayed";
  if (/progress|ongoing|active|doing/.test(s)) return "in_progress";
  if (/plan/.test(s)) return "planned";
  if (/not ?started|to ?do|open|new/.test(s)) return "not_started";
  return null;
}

export function priority(v: string | null | undefined): string | null {
  if (!v) return null;
  const s = lc(v);
  if (/urgent/.test(s) || s === "1" || s === "p1") return "urgent";
  if (/high|important/.test(s) || s === "2" || s === "p2") return "high";
  if (/low/.test(s) || s === "4" || s === "p4") return "low";
  if (/med|normal/.test(s) || s === "3" || s === "p3") return "medium";
  return null;
}

export function bucket(v: string | null | undefined): string | null {
  if (!v) return null;
  const s = lc(v);
  if (/today/.test(s)) return "today";
  const notUrgent = /not urgent/.test(s);
  const notImportant = /not important/.test(s);
  const urgent = /urgent/.test(s) && !notUrgent;
  const important = /important/.test(s) && !notImportant;
  if (urgent && important) return "urgent_important";
  if (important && notUrgent) return "important_not_urgent";
  if (urgent && notImportant) return "urgent_not_important";
  if (notUrgent && notImportant) return "neither";
  return null;
}

export function backlogStatus(v: string | null | undefined): string | null {
  if (!v) return null;
  const s = lc(v);
  if (/sprint/.test(s)) return "in_sprint";
  if (/progress|close-?out/.test(s)) return "in_progress";
  if (/ready/.test(s)) return "ready";
  if (/triag/.test(s)) return "triaged";
  if (/backlog/.test(s)) return "in_backlog";
  if (/block/.test(s)) return "blocked";
  if (/defer/.test(s)) return "deferred";
  if (/cancel/.test(s)) return "cancelled";
  if (/done|complete|closed/.test(s)) return "done";
  if (/new/.test(s)) return "new";
  return null;
}

export function source(v: string | null | undefined): string | null {
  if (!v) return null;
  const s = lc(v);
  if (/health|dashboard/.test(s)) return "health_dashboard";
  if (/extern/.test(s)) return "external";
  if (/incident/.test(s)) return "incident";
  if (/audit/.test(s)) return "audit";
  if (/intern|wish/.test(s)) return "internal";
  return null;
}

export function impact(v: string | null | undefined): string | null {
  if (!v) return null;
  const s = lc(v);
  for (const k of ["critical", "high", "medium", "low"]) if (s.includes(k)) return k;
  return null;
}

export function rag(v: string | null | undefined): string {
  if (!v) return "none";
  const s = lc(v);
  if (/high|red/.test(s)) return "high";
  if (/med|amber/.test(s)) return "medium";
  return "none";
}

export function committedPriority(v: string | null | undefined): number | null {
  const m = v ? /^\s*([1-4])/.exec(v) : null;
  return m ? Number(m[1]) : null;
}

/** "Q3 FY27 (Jan-Mar 2027)" or "FY27-Q3" → "FY27-Q3". */
export function quarterKey(v: string | null | undefined): string | null {
  if (!v) return null;
  const a = /Q([1-4])\s*FY\s?(\d{2})/i.exec(v);
  if (a) return `FY${a[2]}-Q${a[1]}`;
  const b = /FY\s?(\d{2})\s*-?\s*Q([1-4])/i.exec(v);
  if (b) return `FY${b[1]}-Q${b[2]}`;
  return null;
}

export function decision(v: string | null | undefined): string | null {
  if (!v) return null;
  const s = lc(v);
  if (/bandwidth/.test(s)) return "no_bandwidth";
  if (/transfer|ownership/.test(s)) return "transfer";
  if (/cancel/.test(s)) return "cancel";
  if (/defer/.test(s)) return "defer";
  if (/keep|go|yes/.test(s)) return "keep";
  return null;
}

export function health(v: string | null | undefined): string | null {
  if (!v) return null;
  const s = lc(v);
  if (/at risk|amber/.test(s)) return "at_risk";
  if (/behind|red|late/.test(s)) return "behind";
  if (/closed|complete/.test(s)) return "closed";
  if (/not started/.test(s)) return "not_started";
  if (/track|green/.test(s)) return "on_track";
  return null;
}

export function projectStatus(v: string | null | undefined): string | null {
  if (!v) return null;
  const s = lc(v);
  if (/complete|done|closed/.test(s)) return "completed";
  if (/cancel/.test(s)) return "cancelled";
  if (/hold|defer/.test(s)) return "on_hold";
  if (/not started|planned/.test(s)) return "not_started";
  if (/progress|active|track|sprint/.test(s)) return "active";
  return null;
}

export function employmentType(v: string | null | undefined): string {
  if (!v) return "fte";
  const s = lc(v);
  if (/backfill|vacan/.test(s)) return "backfill";
  if (/pool/.test(s)) return "pool";
  if (/contract|ctr|consult|a-/.test(s)) return "contractor";
  return "fte";
}

/** Splits "a;b;c" lists; ignores junk like bare numbers. */
export function list(v: string | null | undefined): string[] {
  if (!v) return [];
  return v
    .split(/[;\n]/)
    .map((x) => x.trim())
    .filter((x) => x && /[a-z]/i.test(x))
    .slice(0, 100);
}

export function matchByLabel<T extends { key: string; label: string }>(items: T[], v: string | null | undefined): string | null {
  if (!v) return null;
  const n = norm(v);
  const hit = items.find((i) => norm(i.label) === n || norm(i.key) === n) ?? items.find((i) => n.includes(norm(i.label)) || norm(i.label).includes(n));
  return hit?.key ?? null;
}
