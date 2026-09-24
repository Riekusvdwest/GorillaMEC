import Link from "next/link";
import { X, Trash2, MessageSquare } from "lucide-react";
import type { Workspace } from "@/lib/workspace";
import { BUCKETS, PRIORITIES, enabledStatuses } from "@/lib/blueprint";
import { Checklist } from "@/components/app/checklist";
import { StartTimerButton } from "@/components/app/timer";
import { Field, Input, Select, Textarea, Label } from "@/components/ui";
import { SubmitButton } from "@/components/client-ui";
import { updateTask, deleteTask, addComment, logTime } from "@/app/app/actions/work";
import { getMembers } from "@/lib/queries";
import { formatDate, formatHours } from "@/lib/utils";
import type { Task } from "@/lib/types";

/** Slide-over editor for a task, driven by ?task=<id> in the URL. */
export async function TaskPanel({ ws, taskId, closeHref }: { ws: Workspace; taskId: string; closeHref: string }) {
  const { data } = await ws.supabase.from("tasks").select("*, project:projects(id, name)").eq("id", taskId).eq("organization_id", ws.org.id).maybeSingle();
  if (!data) return null;
  const task = data as Task & { project: { id: string; name: string } | null };
  const [members, { data: phases }, { data: comments }, { data: time }, { data: running }] = await Promise.all([
    getMembers(ws),
    task.project_id ? ws.supabase.from("phases").select("id, name").eq("project_id", task.project_id).order("position") : Promise.resolve({ data: [] }),
    ws.supabase.from("task_comments").select("id, body, created_at, author_id").eq("task_id", task.id).order("created_at"),
    ws.supabase.from("time_entries").select("minutes, started_at, ended_at").eq("task_id", task.id).eq("user_id", ws.user.id),
    ws.supabase.from("time_entries").select("id").eq("task_id", task.id).eq("user_id", ws.user.id).is("ended_at", null).maybeSingle(),
  ]);
  const myMinutes = (time ?? []).reduce((s, t) => s + (t.minutes ?? 0), 0);
  const ro = !ws.canWrite;
  const nameOf = (id: string | null) => members.find((m) => m.user_id === id)?.name ?? "Someone";

  return (
    <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true" aria-label="Task details">
      <Link href={closeHref} scroll={false} className="absolute inset-0 bg-navy-950/30" aria-label="Close" />
      <div className="relative flex h-full w-full max-w-xl flex-col overflow-y-auto bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[var(--border)] bg-white px-5 py-3">
          <div className="min-w-0 text-sm text-[var(--muted)]">
            {task.project ? (
              <Link href={`/app/projects/${task.project.id}`} className="truncate hover:text-navy-900">
                {task.project.name}
              </Link>
            ) : (
              "Personal task"
            )}
          </div>
          <div className="flex items-center gap-2">
            {ws.blueprint.timeTracking && !ro ? <StartTimerButton taskId={task.id} projectId={task.project_id} running={Boolean(running)} /> : null}
            <Link href={closeHref} scroll={false} className="rounded-md p-1.5 text-navy-400 hover:bg-navy-50 hover:text-navy-800" aria-label="Close">
              <X className="h-5 w-5" />
            </Link>
          </div>
        </div>

        <form action={updateTask} className="space-y-4 px-5 py-5">
          <input type="hidden" name="id" value={task.id} />
          <Textarea name="title" defaultValue={task.title} rows={2} className="min-h-0 border-transparent px-0 text-xl font-semibold hover:border-[var(--border)] focus:px-3" disabled={ro} aria-label="Title" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Status">
              <Select name="status" defaultValue={task.status} disabled={ro}>
                {enabledStatuses(ws.blueprint).map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                {!enabledStatuses(ws.blueprint).some((s) => s.key === task.status) ? <option value={task.status}>{task.status}</option> : null}
              </Select>
            </Field>
            <Field label="Priority">
              <Select name="priority" defaultValue={task.priority} disabled={ro}>
                {PRIORITIES.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
              </Select>
            </Field>
            <Field label="Assignee">
              <Select name="assignee_id" defaultValue={task.assignee_id ?? ""} disabled={ro}>
                <option value="">Unassigned</option>
                {members.filter((m) => m.role !== "guest").map((m) => <option key={m.user_id} value={m.user_id}>{m.name}</option>)}
              </Select>
            </Field>
            {ws.blueprint.modules.eisenhower ? (
              <Field label="Eisenhower bucket">
                <Select name="bucket" defaultValue={task.bucket ?? ""} disabled={ro}>
                  <option value="">No bucket</option>
                  {BUCKETS.map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}
                </Select>
              </Field>
            ) : null}
            <Field label="Start">
              <Input type="date" name="start_date" defaultValue={task.start_date ?? ""} disabled={ro} />
            </Field>
            <Field label="Due">
              <Input type="date" name="due_date" defaultValue={task.due_date ?? ""} disabled={ro} />
            </Field>
            {phases && phases.length ? (
              <Field label={ws.blueprint.levels.phase.label}>
                <Select name="phase_id" defaultValue={task.phase_id ?? ""} disabled={ro}>
                  <option value="">None</option>
                  {phases.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
              </Field>
            ) : null}
            <Field label="Discipline">
              <Select name="resource_type" defaultValue={task.resource_type ?? ""} disabled={ro}>
                <option value="">—</option>
                {ws.blueprint.disciplines.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
              </Select>
            </Field>
            <Field label={ws.blueprint.estimation === "points" ? "Story points" : "Estimated hours"}>
              <Input type="number" step="0.5" min={0} name={ws.blueprint.estimation === "points" ? "story_points" : "estimate_hours"} defaultValue={(ws.blueprint.estimation === "points" ? task.story_points : task.estimate_hours) ?? ""} disabled={ro} />
            </Field>
            <Field label="% complete">
              <Input type="number" min={0} max={100} step={5} name="percent_complete" defaultValue={task.percent_complete} disabled={ro} />
            </Field>
          </div>
          <Field label="Description">
            <Textarea name="description" defaultValue={task.description ?? ""} rows={4} disabled={ro} placeholder="Details, acceptance criteria, links…" />
          </Field>
          <Field label="Reference">
            <Input name="reference" defaultValue={task.reference ?? ""} disabled={ro} placeholder="Document name, ticket or URL" />
          </Field>
          {!ro ? (
            <div className="flex justify-end">
              <SubmitButton pendingText="Saving…">Save changes</SubmitButton>
            </div>
          ) : null}
        </form>

        <section className="border-t border-[var(--border)] px-5 py-5">
          <Label>Checklist</Label>
          <Checklist taskId={task.id} items={task.checklist ?? []} readOnly={ro} />
        </section>

        {ws.blueprint.timeTracking ? (
          <section className="border-t border-[var(--border)] px-5 py-5">
            <div className="flex items-center justify-between">
              <Label className="mb-0">Your time on this task</Label>
              <span className="text-sm font-medium text-navy-900">{formatHours(myMinutes)}</span>
            </div>
            {!ro ? (
              <form action={logTime} className="mt-3 flex flex-wrap items-end gap-2">
                <input type="hidden" name="task_id" value={task.id} />
                <input type="hidden" name="project_id" value={task.project_id ?? ""} />
                <Input type="date" name="date" className="w-40" defaultValue={new Date().toISOString().slice(0, 10)} aria-label="Date" />
                <Input type="number" name="hours" step="0.25" min="0.25" placeholder="Hours" className="w-24" aria-label="Hours" />
                <SubmitButton variant="secondary" size="md">Log</SubmitButton>
              </form>
            ) : null}
          </section>
        ) : null}

        <section className="border-t border-[var(--border)] px-5 py-5">
          <Label className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" /> Comments
          </Label>
          <ul className="space-y-3">
            {(comments ?? []).map((c) => (
              <li key={c.id} className="rounded-lg bg-navy-50/70 px-3 py-2">
                <p className="text-xs text-[var(--muted)]">
                  {nameOf(c.author_id)} · {formatDate(c.created_at, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-navy-900">{c.body}</p>
              </li>
            ))}
          </ul>
          {!ro ? (
            <form action={addComment} className="mt-3 space-y-2">
              <input type="hidden" name="task_id" value={task.id} />
              <input type="hidden" name="project_id" value={task.project_id ?? ""} />
              <Textarea name="body" rows={2} placeholder="Write a comment…" className="min-h-0" required />
              <div className="flex justify-end">
                <SubmitButton variant="secondary" size="sm">Comment</SubmitButton>
              </div>
            </form>
          ) : null}
        </section>

        {!ro ? (
          <form action={deleteTask} className="mt-auto border-t border-[var(--border)] px-5 py-4">
            <input type="hidden" name="id" value={task.id} />
            <input type="hidden" name="back" value={closeHref} />
            <button type="submit" className="inline-flex items-center gap-2 text-sm text-red-600 hover:text-red-700">
              <Trash2 className="h-4 w-4" /> Delete task
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
