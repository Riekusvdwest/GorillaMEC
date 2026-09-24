"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { writeContext, check } from "@/lib/action-context";
import { ALL_STATUSES, BUCKETS, PRIORITIES } from "@/lib/blueprint";
import { bool, num, str } from "@/lib/utils";
import type { ChecklistItem } from "@/lib/types";

const STATUS_KEYS = ALL_STATUSES.map((s) => s.key) as string[];
const PRIORITY_KEYS = PRIORITIES.map((p) => p.key) as string[];
const BUCKET_KEYS = BUCKETS.map((b) => b.key) as string[];

function refresh(projectId?: string | null) {
  revalidatePath("/app", "layout");
  if (projectId) revalidatePath(`/app/projects/${projectId}`);
}

// Projects -------------------------------------------------------------------

export async function createProject(fd: FormData) {
  const ws = await writeContext();
  const name = str(fd, "name");
  if (!name) return;
  const project = check(
    await ws.supabase
      .from("projects")
      .insert({
        organization_id: ws.org.id,
        name,
        category: str(fd, "category"),
        site: str(fd, "site"),
        program_id: str(fd, "program_id"),
        methodology: str(fd, "methodology") ?? ws.blueprint.methodology,
        start_date: str(fd, "start_date"),
        end_date: str(fd, "end_date"),
        status: "active",
        health: "on_track",
      })
      .select("id")
      .single(),
  );
  if (bool(fd, "use_template") && ws.blueprint.levels.phase.enabled && ws.blueprint.phaseTemplate.length) {
    check(
      await ws.supabase
        .from("phases")
        .insert(ws.blueprint.phaseTemplate.filter(Boolean).map((p, i) => ({ organization_id: ws.org.id, project_id: project.id, name: p, position: i }))),
    );
  }
  redirect(`/app/projects/${project.id}`);
}

const PROJECT_FIELDS = [
  "name", "code", "description", "scope", "methodology", "status", "health", "category", "site", "decision", "owner_label",
  "lead_person_id", "pm_person_id", "start_date", "end_date", "committed_quarter", "reference_links", "program_id",
] as const;

export async function updateProject(fd: FormData) {
  const ws = await writeContext();
  const id = str(fd, "id")!;
  const patch: Record<string, unknown> = {};
  for (const f of PROJECT_FIELDS) if (fd.has(f)) patch[f] = str(fd, f);
  for (const f of ["budget_original", "budget_current"]) if (fd.has(f)) patch[f] = num(fd, f);
  if (patch.name === null) delete patch.name;
  check(await ws.supabase.from("projects").update(patch).eq("id", id).eq("organization_id", ws.org.id));
  refresh(id);
}

export async function deleteProject(fd: FormData) {
  const ws = await writeContext();
  if (!ws.isAdmin && ws.role !== "manager") return;
  check(await ws.supabase.from("projects").delete().eq("id", str(fd, "id")!).eq("organization_id", ws.org.id));
  redirect("/app/projects");
}

export async function addPhase(fd: FormData) {
  const ws = await writeContext();
  const projectId = str(fd, "project_id")!;
  const name = str(fd, "name");
  if (!name) return;
  const { count } = await ws.supabase.from("phases").select("id", { count: "exact", head: true }).eq("project_id", projectId);
  check(await ws.supabase.from("phases").insert({ organization_id: ws.org.id, project_id: projectId, name, position: count ?? 0 }));
  refresh(projectId);
}

export async function deletePhase(fd: FormData) {
  const ws = await writeContext();
  check(await ws.supabase.from("phases").delete().eq("id", str(fd, "id")!).eq("organization_id", ws.org.id));
  refresh(str(fd, "project_id"));
}

// Tasks ----------------------------------------------------------------------

export async function createTask(fd: FormData) {
  const ws = await writeContext();
  const title = str(fd, "title");
  if (!title) return;
  const projectId = str(fd, "project_id");
  const status = str(fd, "status");
  const bucket = str(fd, "bucket");
  check(
    await ws.supabase.from("tasks").insert({
      organization_id: ws.org.id,
      project_id: projectId,
      phase_id: str(fd, "phase_id"),
      title,
      status: status && STATUS_KEYS.includes(status) ? status : "not_started",
      priority: str(fd, "priority") ?? "medium",
      bucket: bucket && BUCKET_KEYS.includes(bucket) ? bucket : null,
      assignee_id: fd.get("assign_me") === "1" ? ws.user.id : str(fd, "assignee_id"),
      due_date: str(fd, "due_date"),
      start_date: str(fd, "start_date"),
      estimate_hours: num(fd, "estimate_hours"),
      resource_type: str(fd, "resource_type"),
      position: Date.now() / 1000,
    }),
  );
  refresh(projectId);
}

const TASK_TEXT = ["title", "description", "assignee_id", "person_id", "resource_type", "start_date", "due_date", "phase_id", "project_id", "reference", "sprint_id"] as const;

export async function updateTask(fd: FormData) {
  const ws = await writeContext();
  const id = str(fd, "id")!;
  const patch: Record<string, unknown> = {};
  for (const f of TASK_TEXT) if (fd.has(f)) patch[f] = str(fd, f);
  if (fd.has("status")) {
    const s = str(fd, "status");
    if (s && STATUS_KEYS.includes(s)) patch.status = s;
  }
  if (fd.has("priority")) {
    const p = str(fd, "priority");
    if (p && PRIORITY_KEYS.includes(p)) patch.priority = p;
  }
  if (fd.has("bucket")) {
    const b = str(fd, "bucket");
    patch.bucket = b && BUCKET_KEYS.includes(b) ? b : null;
  }
  for (const f of ["estimate_hours", "story_points", "percent_complete"]) if (fd.has(f)) patch[f] = num(fd, f);
  if (patch.percent_complete === null) patch.percent_complete = 0;
  if (patch.title === null) delete patch.title;
  const row = check(await ws.supabase.from("tasks").update(patch).eq("id", id).eq("organization_id", ws.org.id).select("project_id").single());
  refresh(row.project_id);
}

/** Used by drag and drop on boards: status or bucket changes. */
export async function moveTask(id: string, field: "status" | "bucket", value: string | null) {
  const ws = await writeContext();
  if (field === "status" && (!value || !STATUS_KEYS.includes(value))) return { error: "Invalid status" };
  if (field === "bucket" && value && !BUCKET_KEYS.includes(value)) return { error: "Invalid bucket" };
  const { data, error } = await ws.supabase.from("tasks").update({ [field]: value }).eq("id", id).eq("organization_id", ws.org.id).select("project_id").single();
  if (error) return { error: error.message };
  refresh(data.project_id);
  return {};
}

export async function deleteTask(fd: FormData) {
  const ws = await writeContext();
  const row = check(await ws.supabase.from("tasks").delete().eq("id", str(fd, "id")!).eq("organization_id", ws.org.id).select("project_id").single());
  refresh(row.project_id);
  const back = str(fd, "back");
  if (back?.startsWith("/app")) redirect(back);
}

export async function setChecklist(taskId: string, items: ChecklistItem[]) {
  const ws = await writeContext();
  const clean = items.filter((i) => i.text.trim()).slice(0, 100).map((i) => ({ text: i.text.trim().slice(0, 300), done: Boolean(i.done) }));
  const { data, error } = await ws.supabase.from("tasks").update({ checklist: clean }).eq("id", taskId).eq("organization_id", ws.org.id).select("project_id").single();
  if (error) return { error: error.message };
  refresh(data.project_id);
  return {};
}

export async function addComment(fd: FormData) {
  const ws = await writeContext();
  const body = str(fd, "body");
  const taskId = str(fd, "task_id")!;
  if (!body) return;
  check(await ws.supabase.from("task_comments").insert({ organization_id: ws.org.id, task_id: taskId, body }));
  refresh(str(fd, "project_id"));
}

// Dated updates (feed the stakeholder email) ----------------------------------

export async function addUpdate(fd: FormData) {
  const ws = await writeContext();
  const body = str(fd, "body");
  if (!body) return;
  check(
    await ws.supabase.from("item_updates").insert({
      organization_id: ws.org.id,
      body,
      project_id: str(fd, "project_id"),
      backlog_item_id: str(fd, "backlog_item_id"),
      task_id: str(fd, "task_id"),
    }),
  );
  refresh(str(fd, "project_id"));
  const bl = str(fd, "backlog_item_id");
  if (bl) revalidatePath(`/app/portfolio/${bl}`);
}

// RAID -----------------------------------------------------------------------

export async function createRaid(fd: FormData) {
  const ws = await writeContext("raid");
  const title = str(fd, "title");
  if (!title) return;
  check(
    await ws.supabase.from("raid_items").insert({
      organization_id: ws.org.id,
      project_id: str(fd, "project_id"),
      kind: str(fd, "kind") ?? "risk",
      title,
      description: str(fd, "description"),
      probability: num(fd, "probability"),
      impact: num(fd, "impact"),
      owner: str(fd, "owner"),
      due_date: str(fd, "due_date"),
    }),
  );
  refresh(str(fd, "project_id"));
}

export async function updateRaidStatus(fd: FormData) {
  const ws = await writeContext("raid");
  check(await ws.supabase.from("raid_items").update({ status: str(fd, "status") }).eq("id", str(fd, "id")!).eq("organization_id", ws.org.id));
  refresh(str(fd, "project_id"));
}

// Time -----------------------------------------------------------------------

export async function startTimer(fd: FormData) {
  const ws = await writeContext();
  // Stop anything already running first.
  await ws.supabase.from("time_entries").update({ ended_at: new Date().toISOString() }).eq("user_id", ws.user.id).eq("organization_id", ws.org.id).is("ended_at", null);
  check(
    await ws.supabase.from("time_entries").insert({
      organization_id: ws.org.id,
      task_id: str(fd, "task_id"),
      project_id: str(fd, "project_id"),
      note: str(fd, "note"),
    }),
  );
  revalidatePath("/app", "layout");
}

export async function stopTimer() {
  const ws = await writeContext();
  check(await ws.supabase.from("time_entries").update({ ended_at: new Date().toISOString() }).eq("user_id", ws.user.id).eq("organization_id", ws.org.id).is("ended_at", null));
  revalidatePath("/app", "layout");
}

export async function logTime(fd: FormData) {
  const ws = await writeContext();
  const minutes = Math.round((num(fd, "hours") ?? 0) * 60);
  if (minutes <= 0) return;
  const date = str(fd, "date") ?? new Date().toISOString().slice(0, 10);
  const started = new Date(`${date}T09:00:00`);
  check(
    await ws.supabase.from("time_entries").insert({
      organization_id: ws.org.id,
      task_id: str(fd, "task_id"),
      project_id: str(fd, "project_id"),
      started_at: started.toISOString(),
      ended_at: new Date(started.getTime() + minutes * 60000).toISOString(),
      minutes,
      note: str(fd, "note"),
    }),
  );
  revalidatePath("/app", "layout");
}
