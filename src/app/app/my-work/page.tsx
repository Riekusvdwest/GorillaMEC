import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Plus } from "lucide-react";
import { getWorkspace } from "@/lib/workspace";
import { BUCKETS, enabledStatuses, statusCategory } from "@/lib/blueprint";
import { Card, PageHeader, Stat, Select, Input, EmptyState } from "@/components/ui";
import { AutoSubmitSelect, SubmitButton } from "@/components/client-ui";
import { PriorityBadge } from "@/components/app/badges";
import { DragBoard } from "@/components/app/drag-board";
import { StartTimerButton } from "@/components/app/timer";
import { TaskPanel } from "@/components/app/task-panel";
import { createTask, updateTask } from "../actions/work";
import { fiscalQuarterOf } from "@/lib/fiscal";
import { cn, formatHours, formatShortDate, toISODate } from "@/lib/utils";
import type { Task } from "@/lib/types";

export const metadata: Metadata = { title: "My work" };

type Row = Task & { project: { id: string; name: string } | null };

export default async function MyWorkPage({ searchParams }: PageProps<"/app/my-work">) {
  const sp = await searchParams;
  const ws = await getWorkspace();
  const bp = ws.blueprint;
  const view = sp.view === "eisenhower" && bp.modules.eisenhower ? "eisenhower" : "list";
  const base = `/app/my-work?view=${view}`;
  const taskId = typeof sp.task === "string" ? sp.task : null;

  const now = new Date();
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const quarter = fiscalQuarterOf(now, bp.company.fiscalYearStartMonth);

  const [{ data }, { data: projects }, { data: time }, { data: running }] = await Promise.all([
    ws.supabase
      .from("tasks")
      .select("*, project:projects(id, name)")
      .eq("organization_id", ws.org.id)
      .eq("assignee_id", ws.user.id)
      .not("status", "in", "(completed,cancelled)")
      .order("due_date", { ascending: true, nullsFirst: false }),
    ws.supabase.from("projects").select("id, name").eq("organization_id", ws.org.id).not("status", "in", "(completed,cancelled)").order("name"),
    ws.supabase.from("time_entries").select("minutes, started_at, project_id").eq("organization_id", ws.org.id).eq("user_id", ws.user.id).gte("started_at", quarter.start.toISOString()),
    ws.supabase.from("time_entries").select("task_id").eq("organization_id", ws.org.id).eq("user_id", ws.user.id).is("ended_at", null).maybeSingle(),
  ]);
  const tasks = (data ?? []) as Row[];
  const today = toISODate(now);
  const in7 = toISODate(new Date(now.getTime() + 7 * 86_400_000));
  const minutesSince = (d: Date) => (time ?? []).filter((t) => new Date(t.started_at) >= d).reduce((s, t) => s + (t.minutes ?? 0), 0);

  const groups = [
    { key: "overdue", label: "Overdue", tone: "text-red-600", items: tasks.filter((t) => t.due_date && t.due_date < today) },
    { key: "today", label: "Today", tone: "text-brand-600", items: tasks.filter((t) => t.due_date === today || (t.bucket === "today" && (!t.due_date || t.due_date > today))) },
    { key: "week", label: "Next 7 days", tone: "text-navy-900", items: tasks.filter((t) => t.due_date && t.due_date > today && t.due_date <= in7 && t.bucket !== "today") },
    { key: "later", label: "Later", tone: "text-navy-900", items: tasks.filter((t) => t.due_date && t.due_date > in7 && t.bucket !== "today") },
    { key: "none", label: "No date", tone: "text-navy-900", items: tasks.filter((t) => !t.due_date && t.bucket !== "today") },
  ];

  return (
    <>
      <PageHeader
        title="My work"
        subtitle={`${tasks.length} open ${tasks.length === 1 ? "item" : "items"} assigned to you`}
        actions={
          bp.modules.eisenhower ? (
            <div className="flex rounded-lg border border-[var(--border)] bg-white p-0.5 text-sm">
              <Link href="/app/my-work" className={cn("rounded-md px-3 py-1.5", view === "list" ? "bg-navy-900 text-white" : "text-navy-700")}>By date</Link>
              <Link href="/app/my-work?view=eisenhower" className={cn("rounded-md px-3 py-1.5", view === "eisenhower" ? "bg-navy-900 text-white" : "text-navy-700")}>Eisenhower</Link>
            </div>
          ) : null
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Overdue" value={groups[0]!.items.length} tone={groups[0]!.items.length ? "red" : undefined} />
        <Stat label="Due in 7 days" value={groups[1]!.items.length + groups[2]!.items.length} />
        {bp.timeTracking ? (
          <>
            <Stat label="Hours this week" value={formatHours(minutesSince(weekStart))} hint={`${formatHours(minutesSince(monthStart))} this month`} />
            <Stat label={`Hours ${quarter.short}`} value={formatHours(minutesSince(quarter.start))} />
          </>
        ) : null}
      </div>

      {ws.canWrite ? (
        <Card className="mb-6">
          <form action={createTask} className="flex flex-wrap items-center gap-2 p-3">
            <input type="hidden" name="assign_me" value="1" />
            <Plus className="ml-1 h-4 w-4 text-navy-300" aria-hidden />
            <input name="title" required placeholder="Add something to your list…" className="h-9 min-w-[220px] flex-1 bg-transparent text-sm focus:outline-none" aria-label="Task title" />
            <Select name="project_id" defaultValue="" className="h-9 w-48" aria-label="Project">
              <option value="">No project</option>
              {(projects ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
            {bp.modules.eisenhower ? (
              <Select name="bucket" defaultValue="" className="h-9 w-48" aria-label="Bucket">
                <option value="">No bucket</option>
                {BUCKETS.map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}
              </Select>
            ) : null}
            <Input type="date" name="due_date" className="h-9 w-40" aria-label="Due date" />
            <SubmitButton size="md">Add</SubmitButton>
          </form>
        </Card>
      ) : null}

      {!tasks.length ? (
        <EmptyState icon={<CheckCircle2 className="h-10 w-10" />} title="Nothing on your plate" body="Tasks assigned to you across every project show up here." />
      ) : view === "eisenhower" ? (
        <DragBoard
          field="bucket"
          grid
          linkBase={base}
          readOnly={!ws.canWrite}
          columns={[
            ...BUCKETS.filter((b) => b.key !== "today").map((b) => ({ key: b.key, label: b.label, hint: b.hint, tone: (b.key === "urgent_important" ? "red" : b.key === "important_not_urgent" ? "blue" : b.key === "urgent_not_important" ? "amber" : "neutral") as "red" | "blue" | "amber" | "neutral" })),
            { key: "today", label: "Need to do today", hint: "Do now", tone: "brand" as const },
            { key: "__none", label: "No bucket yet", hint: "Sort these", tone: "neutral" as const },
          ]}
          cards={tasks.map((t) => ({ id: t.id, title: t.title, status: t.status, bucket: t.bucket, priority: t.priority, due_date: t.due_date, project: t.project?.name ?? null }))}
        />
      ) : (
        <div className="space-y-5">
          {groups.filter((g) => g.items.length).map((g) => (
            <Card key={g.key} className="overflow-hidden">
              <h2 className={cn("border-b border-[var(--border)] bg-navy-50/50 px-4 py-2.5 text-sm font-semibold", g.tone)}>
                {g.label} <span className="font-normal text-[var(--muted)]">{g.items.length}</span>
              </h2>
              <ul className="divide-y divide-[var(--border)]">
                {g.items.map((t) => (
                  <li key={t.id} className="flex flex-wrap items-center gap-3 px-4 py-2 hover:bg-navy-50/40">
                    {bp.timeTracking && ws.canWrite ? <StartTimerButton taskId={t.id} projectId={t.project_id} running={running?.task_id === t.id} /> : null}
                    {ws.canWrite ? (
                      <form action={updateTask}>
                        <input type="hidden" name="id" value={t.id} />
                        <AutoSubmitSelect name="status" defaultValue={t.status} aria-label="Status" className="w-32">
                          {enabledStatuses(bp).map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                        </AutoSubmitSelect>
                      </form>
                    ) : null}
                    <Link href={`${base}&task=${t.id}`} scroll={false} className="min-w-0 flex-1 truncate text-sm font-medium text-navy-900 hover:text-brand-700">
                      {t.title}
                    </Link>
                    <PriorityBadge priority={t.priority} />
                    {t.project ? <Link href={`/app/projects/${t.project.id}`} className="hidden max-w-[220px] truncate text-xs text-[var(--muted)] hover:text-navy-900 sm:inline">{t.project.name}</Link> : null}
                    <span className={cn("w-16 text-right text-sm tabular-nums", g.key === "overdue" ? "font-medium text-red-600" : "text-navy-700")}>
                      {t.due_date ? formatShortDate(t.due_date) : ""}
                    </span>
                    {statusCategory(t.status) === "blocked" ? <span className="text-xs font-medium text-red-600">Blocked</span> : null}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}

      {taskId ? <TaskPanel ws={ws} taskId={taskId} closeHref={base} /> : null}
    </>
  );
}
