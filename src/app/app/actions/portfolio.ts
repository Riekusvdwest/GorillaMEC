"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { writeContext, check } from "@/lib/action-context";
import { BACKLOG_STATUSES, SOURCES } from "@/lib/types";
import { bool, num, str } from "@/lib/utils";

const STATUS = BACKLOG_STATUSES.map((s) => s.key) as string[];
const SOURCE = SOURCES.map((s) => s.key) as string[];

function refresh(id?: string | null) {
  revalidatePath("/app", "layout");
  if (id) revalidatePath(`/app/portfolio/${id}`);
}

export async function createBacklogItem(fd: FormData) {
  const ws = await writeContext("portfolio");
  const title = str(fd, "title");
  if (!title) return;
  const src = str(fd, "source");
  const row = check(
    await ws.supabase
      .from("backlog_items")
      .insert({
        organization_id: ws.org.id,
        title,
        description: str(fd, "description"),
        source: src && SOURCE.includes(src) ? src : "internal",
        site: str(fd, "site"),
        category: str(fd, "category"),
        business_impact: str(fd, "business_impact"),
        target_quarter: str(fd, "target_quarter"),
        requestor_name: str(fd, "requestor_name") ?? ws.user.name,
      })
      .select("id")
      .single(),
  );
  redirect(`/app/portfolio/${row.id}`);
}

const TEXT_FIELDS = [
  "title", "description", "justification", "requestor_name", "requestor_email", "requestor_role", "pillar", "category", "site",
  "business_impact", "target_quarter", "dependencies", "suggested_solution", "suggested_owner", "external_link", "rag",
  "committed_quarter", "planned_start", "planned_end", "pillar_impact", "mc_date",
] as const;

export async function updateBacklogItem(fd: FormData) {
  const ws = await writeContext("portfolio");
  const id = str(fd, "id")!;
  const patch: Record<string, unknown> = {};
  for (const f of TEXT_FIELDS) if (fd.has(f)) patch[f] = str(fd, f);
  if (fd.has("status")) {
    const s = str(fd, "status");
    if (s && STATUS.includes(s)) patch.status = s;
  }
  if (fd.has("source")) {
    const s = str(fd, "source");
    if (s && SOURCE.includes(s)) patch.source = s;
  }
  if (fd.has("committed_priority")) patch.committed_priority = num(fd, "committed_priority");
  if (fd.has("percent_complete")) patch.percent_complete = num(fd, "percent_complete") ?? 0;
  for (const f of ["downtime_required", "kpi_moved", "new_issue_raised", "feedback_to_backlog"]) {
    if (fd.has(`${f}__present`)) patch[f] = fd.get(f) === "yes" ? true : fd.get(f) === "no" ? false : null;
  }
  if (fd.has("ready__present")) patch.ready_for_prioritization = bool(fd, "ready_for_prioritization");
  if (patch.title === null) delete patch.title;
  if (patch.rag === null) patch.rag = "none";
  check(await ws.supabase.from("backlog_items").update(patch).eq("id", id).eq("organization_id", ws.org.id));
  refresh(id);
}

export async function setScores(fd: FormData) {
  const ws = await writeContext("portfolio");
  const id = str(fd, "id")!;
  const scale = ws.blueprint.scoring.scale;
  const scores: Record<string, number> = {};
  for (const c of ws.blueprint.scoring.criteria) {
    const v = num(fd, `score_${c.key}`);
    if (v !== null && v >= 1 && v <= scale) scores[c.key] = v;
  }
  check(await ws.supabase.from("backlog_items").update({ scores }).eq("id", id).eq("organization_id", ws.org.id));
  refresh(id);
}

export async function saveAllocation(fd: FormData) {
  const ws = await writeContext("resources");
  const itemId = str(fd, "backlog_item_id");
  const projectId = str(fd, "project_id");
  const discipline = str(fd, "discipline");
  const hours = num(fd, "hours");
  if (!discipline || hours === null || (!itemId && !projectId)) return;
  check(
    await ws.supabase.from("allocations").insert({
      organization_id: ws.org.id,
      backlog_item_id: itemId,
      project_id: projectId,
      discipline,
      person_id: str(fd, "person_id"),
      quarter: str(fd, "quarter"),
      hours,
    }),
  );
  refresh(itemId);
  if (projectId) revalidatePath(`/app/projects/${projectId}`);
}

export async function deleteAllocation(fd: FormData) {
  const ws = await writeContext("resources");
  check(await ws.supabase.from("allocations").delete().eq("id", str(fd, "id")!).eq("organization_id", ws.org.id));
  refresh(str(fd, "backlog_item_id"));
}

export async function feedbackToBacklog(fd: FormData) {
  const ws = await writeContext("portfolio");
  const parentId = str(fd, "id")!;
  const title = str(fd, "title");
  if (!title) return;
  const row = check(
    await ws.supabase
      .from("backlog_items")
      .insert({ organization_id: ws.org.id, title, parent_item_id: parentId, source: "internal", description: str(fd, "description"), requestor_name: ws.user.name })
      .select("id")
      .single(),
  );
  check(await ws.supabase.from("backlog_items").update({ feedback_to_backlog: true }).eq("id", parentId).eq("organization_id", ws.org.id));
  redirect(`/app/portfolio/${row.id}`);
}

/** Turns a committed backlog item into a project with the default phase template. */
export async function convertToProject(fd: FormData) {
  const ws = await writeContext("portfolio");
  const id = str(fd, "id")!;
  const item = check(await ws.supabase.from("backlog_items").select("*").eq("id", id).eq("organization_id", ws.org.id).single());
  if (item.project_id) redirect(`/app/projects/${item.project_id}`);
  const project = check(
    await ws.supabase
      .from("projects")
      .insert({
        organization_id: ws.org.id,
        name: item.title,
        description: item.description,
        scope: item.suggested_solution,
        category: item.category,
        site: item.site,
        start_date: item.planned_start,
        end_date: item.planned_end,
        committed_quarter: item.committed_quarter,
        decision: "keep",
        backlog_item_id: item.id,
        methodology: ws.blueprint.methodology,
        status: "active",
        health: item.rag === "high" ? "at_risk" : "on_track",
      })
      .select("id")
      .single(),
  );
  if (ws.blueprint.levels.phase.enabled && ws.blueprint.phaseTemplate.length) {
    check(
      await ws.supabase
        .from("phases")
        .insert(ws.blueprint.phaseTemplate.filter(Boolean).map((p, i) => ({ organization_id: ws.org.id, project_id: project.id, name: p, position: i }))),
    );
  }
  check(await ws.supabase.from("allocations").update({ project_id: project.id }).eq("backlog_item_id", id).eq("organization_id", ws.org.id));
  check(
    await ws.supabase
      .from("backlog_items")
      .update({ project_id: project.id, status: item.status === "new" || item.status === "triaged" || item.status === "ready" ? "in_sprint" : item.status })
      .eq("id", id)
      .eq("organization_id", ws.org.id),
  );
  redirect(`/app/projects/${project.id}`);
}

export async function deleteBacklogItem(fd: FormData) {
  const ws = await writeContext("portfolio");
  check(await ws.supabase.from("backlog_items").delete().eq("id", str(fd, "id")!).eq("organization_id", ws.org.id));
  redirect("/app/portfolio");
}

export async function setIntakeForm(fd: FormData) {
  const ws = await writeContext("intake");
  const existing = await ws.supabase.from("intake_forms").select("id").eq("organization_id", ws.org.id).limit(1).maybeSingle();
  const patch = { title: str(fd, "title") ?? "Raise a request", description: str(fd, "description"), active: bool(fd, "active") };
  if (existing.data) check(await ws.supabase.from("intake_forms").update(patch).eq("id", existing.data.id));
  else check(await ws.supabase.from("intake_forms").insert({ organization_id: ws.org.id, ...patch }));
  revalidatePath("/app/portfolio");
}
