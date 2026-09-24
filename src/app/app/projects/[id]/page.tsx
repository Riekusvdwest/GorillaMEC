import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { getWorkspace } from "@/lib/workspace";
import { enabledStatuses, statusCategory, plural, type Blueprint } from "@/lib/blueprint";
import { Badge, Card, CardHeader, Field, Input, Select, Textarea, Progress } from "@/components/ui";
import { AutoSubmitSelect, SubmitButton } from "@/components/client-ui";
import { HealthBadge, PriorityBadge, TaskStatusBadge } from "@/components/app/badges";
import { DragBoard } from "@/components/app/drag-board";
import { Timeline } from "@/components/app/timeline";
import { TaskPanel } from "@/components/app/task-panel";
import { getMembers, getPeople } from "@/lib/queries";
import { addPhase, addUpdate, createRaid, createTask, deletePhase, deleteProject, updateProject, updateRaidStatus, updateTask } from "../../actions/work";
import { upcomingQuarters, quarterByKey } from "@/lib/fiscal";
import { cn, formatDate, formatMoney, formatShortDate } from "@/lib/utils";
import { DECISIONS, PROJECT_HEALTH, PROJECT_STATUS, type Phase, type Project, type RaidItem, type Task } from "@/lib/types";

export const metadata: Metadata = { title: "Project" };

type View = "overview" | "list" | "kanban" | "timeline" | "raid";

export default async function ProjectPage({ params, searchParams }: PageProps<"/app/projects/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const ws = await getWorkspace();
  const bp = ws.blueprint;

  const { data: project } = await ws.supabase.from("projects").select("*").eq("id", id).eq("organization_id", ws.org.id).maybeSingle();
  if (!project) notFound();
  const p = project as Project;

  const views: { key: View; label: string }[] = [];
  if (bp.modules.charters) views.push({ key: "overview", label: "Charter" });
  views.push({ key: "list", label: "List" });
  if (bp.views.includes("kanban")) views.push({ key: "kanban", label: "Board" });
  if (bp.views.includes("timeline")) views.push({ key: "timeline", label: "Timeline" });
  if (ws.features.has("raid")) views.push({ key: "raid", label: "RAID" });
  const fallback: View = (["list", "kanban", "timeline"] as View[]).includes(bp.defaultView as View) ? (bp.defaultView as View) : "list";
  const view = (views.find((v) => v.key === sp.view)?.key ?? (bp.modules.charters ? "overview" : fallback)) as View;
  const taskId = typeof sp.task === "string" ? sp.task : null;
  const base = `/app/projects/${p.id}?view=${view}`;

  const [{ data: taskRows }, { data: phaseRows }, members] = await Promise.all([
    ws.supabase.from("tasks").select("*").eq("project_id", p.id).order("position"),
    ws.supabase.from("phases").select("*").eq("project_id", p.id).order("position"),
    getMembers(ws),
  ]);
  const tasks = (taskRows ?? []) as Task[];
  const phases = (phaseRows ?? []) as Phase[];
  const done = tasks.filter((t) => statusCategory(t.status) === "done").length;
  const memberName = (uid: string | null) => (uid ? members.find((m) => m.user_id === uid)?.name ?? null : null);
  const phaseLabel = bp.levels.phase.label;

  return (
    <>
      <div className="mb-6">
        <Link href="/app/projects" className="text-sm text-[var(--muted)] hover:text-navy-900">← {plural(bp.levels.project.label)}</Link>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-navy-950">
              {p.code ? <span className="mr-2 text-[var(--muted)]">{p.code}</span> : null}
              {p.name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-[var(--muted)]">
              <HealthBadge health={p.health} />
              <span>{PROJECT_STATUS.find((s) => s.key === p.status)?.label}</span>
              {p.category ? <span>· {p.category}</span> : null}
              {p.site ? <span>· {p.site}</span> : null}
              {p.start_date || p.end_date ? <span>· {formatDate(p.start_date)} – {formatDate(p.end_date)}</span> : null}
              {p.is_demo ? <Badge>Sample</Badge> : null}
            </div>
          </div>
          <div className="w-full max-w-[220px]">
            <Progress value={tasks.length ? (done / tasks.length) * 100 : 0} />
            <p className="mt-1 text-right text-xs text-[var(--muted)]">{done}/{tasks.length} {plural(bp.levels.task.label).toLowerCase()} done</p>
          </div>
        </div>
        <nav className="mt-5 flex gap-1 border-b border-[var(--border)]" aria-label="Project views">
          {views.map((v) => (
            <Link
              key={v.key}
              href={`/app/projects/${p.id}?view=${v.key}`}
              className={cn("-mb-px border-b-2 px-3 py-2 text-sm", view === v.key ? "border-brand-500 font-medium text-navy-950" : "border-transparent text-[var(--muted)] hover:text-navy-900")}
            >
              {v.label}
            </Link>
          ))}
        </nav>
      </div>

      {view === "overview" ? <Charter ws={ws} p={p} tasks={tasks} /> : null}

      {view === "list" ? (
        <div className="space-y-5">
          {(bp.levels.phase.enabled && phases.length ? [...phases, { id: "", name: `No ${phaseLabel.toLowerCase()}`, position: 999, project_id: p.id }] : [{ id: "", name: "", position: 0, project_id: p.id }]).map((ph) => {
            const list = tasks.filter((t) => (ph.id ? t.phase_id === ph.id : !t.phase_id || !phases.some((x) => x.id === t.phase_id)));
            if (!ph.id && ph.name && !list.length) return null;
            const hours = list.reduce((s, t) => s + (Number(t.estimate_hours) || 0), 0);
            return (
              <Card key={ph.id || "none"} className="overflow-hidden">
                {ph.name ? (
                  <div className="flex items-center justify-between border-b border-[var(--border)] bg-navy-50/50 px-4 py-2.5">
                    <h2 className="text-sm font-semibold text-navy-900">
                      {ph.name} <span className="ml-1 font-normal text-[var(--muted)]">{list.length}{hours ? ` · ${hours} h` : ""}</span>
                    </h2>
                    {ph.id && ws.canWrite && !list.length ? (
                      <form action={deletePhase}>
                        <input type="hidden" name="id" value={ph.id} />
                        <input type="hidden" name="project_id" value={p.id} />
                        <button className="text-navy-300 hover:text-red-600" aria-label={`Delete ${ph.name}`}><Trash2 className="h-4 w-4" /></button>
                      </form>
                    ) : null}
                  </div>
                ) : null}
                <TaskTable tasks={list} bp={bp} base={base} memberName={memberName} canWrite={ws.canWrite} />
                {ws.canWrite ? <QuickAdd projectId={p.id} phaseId={ph.id || null} bp={bp} /> : null}
              </Card>
            );
          })}
          {ws.canWrite && bp.levels.phase.enabled ? (
            <form action={addPhase} className="flex max-w-md gap-2">
              <input type="hidden" name="project_id" value={p.id} />
              <Input name="name" placeholder={`New ${phaseLabel.toLowerCase()}`} />
              <SubmitButton variant="secondary"><Plus className="h-4 w-4" /> Add</SubmitButton>
            </form>
          ) : null}
        </div>
      ) : null}

      {view === "kanban" ? (
        <DragBoard
          field="status"
          linkBase={base}
          readOnly={!ws.canWrite}
          columns={enabledStatuses(bp).map((s) => ({
            key: s.key,
            label: s.label,
            tone: statusCategory(s.key) === "done" ? (s.key === "cancelled" ? "neutral" : "green") : statusCategory(s.key) === "blocked" ? "red" : statusCategory(s.key) === "active" ? "blue" : "neutral",
          }))}
          cards={tasks.map((t) => ({
            id: t.id,
            title: t.title,
            status: t.status,
            bucket: t.bucket,
            priority: t.priority,
            due_date: t.due_date,
            assignee: memberName(t.assignee_id)?.split(" ")[0] ?? null,
            checklist: { done: (t.checklist ?? []).filter((c) => c.done).length, total: (t.checklist ?? []).length },
          }))}
        />
      ) : null}

      {view === "timeline" ? (
        <Timeline
          rows={tasks.map((t) => ({
            id: t.id,
            title: t.title,
            start: t.start_date,
            end: t.due_date,
            status: t.status,
            percent: t.percent_complete,
            group: phases.find((x) => x.id === t.phase_id)?.name ?? null,
            href: `${base}&task=${t.id}`,
          }))}
        />
      ) : null}

      {view === "raid" ? <Raid ws={ws} projectId={p.id} /> : null}

      {taskId ? <TaskPanel ws={ws} taskId={taskId} closeHref={base} /> : null}
    </>
  );
}

function TaskTable({ tasks, bp, base, memberName, canWrite }: { tasks: Task[]; bp: Blueprint; base: string; memberName: (id: string | null) => string | null; canWrite: boolean }) {
  if (!tasks.length) return <p className="px-4 py-3 text-sm text-[var(--muted)]">Nothing here yet.</p>;
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <tbody className="divide-y divide-[var(--border)]">
          {tasks.map((t) => {
            const overdue = t.due_date && t.due_date < today && statusCategory(t.status) !== "done";
            return (
              <tr key={t.id} className="hover:bg-navy-50/40">
                <td className="w-40 px-3 py-1.5">
                  {canWrite ? (
                    <form action={updateTask}>
                      <input type="hidden" name="id" value={t.id} />
                      <AutoSubmitSelect name="status" defaultValue={t.status} aria-label="Status">
                        {enabledStatuses(bp).map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                      </AutoSubmitSelect>
                    </form>
                  ) : (
                    <TaskStatusBadge status={t.status} bp={bp} />
                  )}
                </td>
                <td className="px-3 py-2">
                  <Link href={`${base}&task=${t.id}`} scroll={false} className={cn("font-medium hover:text-brand-700", statusCategory(t.status) === "done" ? "text-[var(--muted)] line-through" : "text-navy-900")}>
                    {t.title}
                  </Link>
                  {(t.checklist ?? []).length ? <span className="ml-2 text-xs text-[var(--muted)]">☑ {(t.checklist ?? []).filter((c) => c.done).length}/{t.checklist.length}</span> : null}
                </td>
                <td className="w-24 px-3 py-2"><PriorityBadge priority={t.priority} /></td>
                <td className="w-36 px-3 py-2 text-navy-700">{memberName(t.assignee_id) ?? <span className="text-navy-300">—</span>}</td>
                <td className="w-28 px-3 py-2 text-xs text-[var(--muted)]">{bp.disciplines.find((d) => d.key === t.resource_type)?.label ?? ""}</td>
                <td className="w-16 px-3 py-2 text-right text-xs tabular-nums text-[var(--muted)]">{t.estimate_hours ? `${t.estimate_hours} h` : ""}</td>
                <td className={cn("w-24 px-3 py-2 text-right text-sm tabular-nums", overdue ? "font-medium text-red-600" : "text-navy-700")}>{t.due_date ? formatShortDate(t.due_date) : ""}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function QuickAdd({ projectId, phaseId, bp }: { projectId: string; phaseId: string | null; bp: Blueprint }) {
  return (
    <form action={createTask} className="flex flex-wrap items-center gap-2 border-t border-[var(--border)] bg-navy-50/30 px-3 py-2">
      <input type="hidden" name="project_id" value={projectId} />
      <input type="hidden" name="phase_id" value={phaseId ?? ""} />
      <Plus className="h-4 w-4 text-navy-300" aria-hidden />
      <input name="title" placeholder={`Add a ${bp.levels.task.label.toLowerCase()}…`} className="h-8 min-w-[200px] flex-1 bg-transparent text-sm placeholder:text-navy-300 focus:outline-none" aria-label="New task title" required />
      <input type="date" name="due_date" className="h-8 rounded-md border border-[var(--border)] bg-white px-2 text-xs" aria-label="Due date" />
      <select name="resource_type" className="h-8 rounded-md border border-[var(--border)] bg-white px-2 text-xs" aria-label="Discipline" defaultValue="">
        <option value="">Discipline</option>
        {bp.disciplines.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
      </select>
      <input type="number" name="estimate_hours" step="0.5" min="0" placeholder="h" className="h-8 w-16 rounded-md border border-[var(--border)] bg-white px-2 text-xs" aria-label="Estimated hours" />
      <SubmitButton size="sm" variant="secondary">Add</SubmitButton>
    </form>
  );
}

async function Charter({ ws, p, tasks }: { ws: Awaited<ReturnType<typeof getWorkspace>>; p: Project; tasks: Task[] }) {
  const bp = ws.blueprint;
  const [people, { data: updates }, { data: allocs }, { data: origin }] = await Promise.all([
    getPeople(ws),
    ws.supabase.from("item_updates").select("id, body, created_at").eq("project_id", p.id).order("created_at", { ascending: false }).limit(20),
    ws.features.has("resources") ? ws.supabase.from("allocations").select("discipline, hours, quarter, person_id").eq("project_id", p.id) : Promise.resolve({ data: [] }),
    p.backlog_item_id ? ws.supabase.from("backlog_items").select("id, number, title").eq("id", p.backlog_item_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const quarters = upcomingQuarters(new Date(), bp.company.fiscalYearStartMonth, 4);
  const hoursByDisc = bp.disciplines
    .map((d) => ({ d, est: tasks.filter((t) => t.resource_type === d.key).reduce((s, t) => s + (Number(t.estimate_hours) || 0), 0), alloc: (allocs ?? []).filter((a) => a.discipline === d.key).reduce((s, a) => s + Number(a.hours), 0) }))
    .filter((x) => x.est || x.alloc);
  const ro = !ws.canWrite;
  const variance = p.budget_original && p.budget_current ? p.budget_current - p.budget_original : null;

  return (
    <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
      <Card>
        <CardHeader title="Project charter" subtitle="Everything decided about this project, in one place." />
        <form action={updateProject} className="grid gap-4 p-5 sm:grid-cols-2">
          <input type="hidden" name="id" value={p.id} />
          <Field label="Name" className="sm:col-span-2"><Input name="name" defaultValue={p.name} disabled={ro} /></Field>
          <Field label="Code"><Input name="code" defaultValue={p.code ?? ""} disabled={ro} placeholder="e.g. P-12" /></Field>
          <Field label="Decision">
            <Select name="decision" defaultValue={p.decision ?? ""} disabled={ro}>
              <option value="">Not decided</option>
              {DECISIONS.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
            </Select>
          </Field>
          <Field label="Status">
            <Select name="status" defaultValue={p.status} disabled={ro}>
              {PROJECT_STATUS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </Select>
          </Field>
          <Field label="Health">
            <Select name="health" defaultValue={p.health} disabled={ro}>
              {PROJECT_HEALTH.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </Select>
          </Field>
          <Field label="Category">
            {bp.categories.length ? (
              <Select name="category" defaultValue={p.category ?? ""} disabled={ro}>
                <option value="">—</option>
                {[...new Set([...bp.categories, ...(p.category ? [p.category] : [])])].map((c) => <option key={c}>{c}</option>)}
              </Select>
            ) : (
              <Input name="category" defaultValue={p.category ?? ""} disabled={ro} />
            )}
          </Field>
          <Field label="Site / location"><Input name="site" defaultValue={p.site ?? ""} disabled={ro} /></Field>
          <Field label="Owner"><Input name="owner_label" defaultValue={p.owner_label ?? ""} disabled={ro} placeholder="Owning team or person" /></Field>
          <Field label="Lead">
            <Select name="lead_person_id" defaultValue={p.lead_person_id ?? ""} disabled={ro || !people.length}>
              <option value="">—</option>
              {people.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </Select>
          </Field>
          <Field label="Start"><Input type="date" name="start_date" defaultValue={p.start_date ?? ""} disabled={ro} /></Field>
          <Field label="End"><Input type="date" name="end_date" defaultValue={p.end_date ?? ""} disabled={ro} /></Field>
          <Field label={`Original budget (${bp.company.currency})`}><Input type="number" step="1" name="budget_original" defaultValue={p.budget_original ?? ""} disabled={ro} /></Field>
          <Field label={`Current forecast (${bp.company.currency})`}><Input type="number" step="1" name="budget_current" defaultValue={p.budget_current ?? ""} disabled={ro} /></Field>
          <Field label="Committed quarter">
            <Select name="committed_quarter" defaultValue={p.committed_quarter ?? ""} disabled={ro}>
              <option value="">—</option>
              {quarters.map((q) => <option key={q.key} value={q.key}>{q.label}</option>)}
            </Select>
          </Field>
          <Field label="Method">
            <Select name="methodology" defaultValue={p.methodology} disabled={ro}>
              <option value="waterfall">Waterfall</option>
              <option value="scrum">Scrum</option>
              <option value="kanban">Kanban</option>
              <option value="tasks">Task list</option>
              <option value="hybrid">Hybrid</option>
            </Select>
          </Field>
          <Field label="Work scope" className="sm:col-span-2"><Textarea name="scope" rows={4} defaultValue={p.scope ?? ""} disabled={ro} /></Field>
          <Field label="Reference links" className="sm:col-span-2" hint="Change records, drawings, tickets — one per line.">
            <Textarea name="reference_links" rows={2} defaultValue={p.reference_links ?? ""} disabled={ro} />
          </Field>
          {!ro ? (
            <div className="flex items-center justify-between sm:col-span-2">
              {ws.isAdmin || ws.role === "manager" ? (
                <button formAction={deleteProject} className="text-sm text-red-600 hover:text-red-700">Delete project</button>
              ) : <span />}
              <SubmitButton pendingText="Saving…">Save charter</SubmitButton>
            </div>
          ) : null}
        </form>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader title="Budget" />
          <div className="grid grid-cols-2 gap-4 p-5 text-sm">
            <div>
              <p className="text-[var(--muted)]">Baseline</p>
              <p className="font-display text-xl font-semibold text-navy-950">{formatMoney(p.budget_original, bp.company.currency)}</p>
            </div>
            <div>
              <p className="text-[var(--muted)]">Forecast</p>
              <p className="font-display text-xl font-semibold text-navy-950">{formatMoney(p.budget_current, bp.company.currency)}</p>
              {variance ? <p className={variance > 0 ? "text-red-600" : "text-emerald-600"}>{variance > 0 ? "+" : ""}{formatMoney(variance, bp.company.currency)}</p> : null}
            </div>
          </div>
        </Card>
        <Card>
          <CardHeader title="Hours by discipline" subtitle="Task estimates vs allocated capacity" />
          <div className="p-5">
            {hoursByDisc.length ? (
              <table className="w-full text-sm">
                <thead className="text-xs text-[var(--muted)]">
                  <tr><th className="pb-2 text-left font-medium">Discipline</th><th className="pb-2 text-right font-medium">Estimated</th><th className="pb-2 text-right font-medium">Allocated</th></tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {hoursByDisc.map(({ d, est, alloc }) => (
                    <tr key={d.key}>
                      <td className="py-1.5 text-navy-900">{d.label}</td>
                      <td className="py-1.5 text-right tabular-nums">{est} h</td>
                      <td className="py-1.5 text-right tabular-nums text-[var(--muted)]">{alloc ? `${alloc} h` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-[var(--muted)]">Give tasks a discipline and estimated hours to see totals here.</p>
            )}
          </div>
        </Card>
        {origin ? (
          <Card className="p-5 text-sm">
            <p className="text-[var(--muted)]">Came from backlog item</p>
            <Link className="font-medium text-brand-700 hover:underline" href={`/app/portfolio/${origin.id}`}>BL-{String(origin.number).padStart(3, "0")} · {origin.title}</Link>
            {p.committed_quarter ? <p className="mt-1 text-[var(--muted)]">Committed for {quarterByKey(p.committed_quarter, bp.company.fiscalYearStartMonth)?.short}</p> : null}
          </Card>
        ) : null}
        <Card>
          <CardHeader title="Updates" subtitle="Dated notes. They feed the weekly stakeholder update." />
          <div className="p-5">
            {!ro ? (
              <form action={addUpdate} className="mb-4 space-y-2">
                <input type="hidden" name="project_id" value={p.id} />
                <Textarea name="body" rows={2} className="min-h-0" placeholder="What happened this week?" required />
                <div className="flex justify-end"><SubmitButton size="sm" variant="secondary">Add update</SubmitButton></div>
              </form>
            ) : null}
            <ul className="space-y-3">
              {(updates ?? []).map((u) => (
                <li key={u.id} className="border-l-2 border-brand-200 pl-3">
                  <p className="text-xs text-[var(--muted)]">{formatDate(u.created_at)}</p>
                  <p className="whitespace-pre-wrap text-sm text-navy-900">{u.body}</p>
                </li>
              ))}
              {!updates?.length ? <li className="text-sm text-[var(--muted)]">No updates yet.</li> : null}
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
}

async function Raid({ ws, projectId }: { ws: Awaited<ReturnType<typeof getWorkspace>>; projectId: string }) {
  const { data } = await ws.supabase.from("raid_items").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
  const items = (data ?? []) as RaidItem[];
  const kinds: RaidItem["kind"][] = ["risk", "assumption", "issue", "decision", "action"];
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        {kinds.map((k) => {
          const list = items.filter((i) => i.kind === k);
          return (
            <Card key={k}>
              <CardHeader title={`${k[0]!.toUpperCase()}${k.slice(1)}s`} subtitle={`${list.filter((i) => i.status !== "closed").length} open`} />
              {list.length ? (
                <ul className="divide-y divide-[var(--border)]">
                  {list.map((i) => {
                    const score = i.probability && i.impact ? i.probability * i.impact : null;
                    return (
                      <li key={i.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                        {score !== null ? (
                          <span className={cn("flex h-8 w-8 items-center justify-center rounded-md text-xs font-bold", score >= 15 ? "bg-red-500 text-white" : score >= 8 ? "bg-amber-400 text-navy-950" : "bg-emerald-100 text-emerald-800")} title="Probability × impact">
                            {score}
                          </span>
                        ) : null}
                        <div className="min-w-0 flex-1">
                          <p className={cn("text-sm font-medium", i.status === "closed" ? "text-[var(--muted)] line-through" : "text-navy-900")}>{i.title}</p>
                          <p className="text-xs text-[var(--muted)]">{[i.owner, i.due_date ? `due ${formatShortDate(i.due_date)}` : null].filter(Boolean).join(" · ")}</p>
                        </div>
                        {ws.canWrite ? (
                          <form action={updateRaidStatus}>
                            <input type="hidden" name="id" value={i.id} />
                            <input type="hidden" name="project_id" value={projectId} />
                            <AutoSubmitSelect name="status" defaultValue={i.status} aria-label="Status">
                              <option value="open">Open</option>
                              <option value="in_progress">In progress</option>
                              <option value="closed">Closed</option>
                            </AutoSubmitSelect>
                          </form>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="px-5 py-3 text-sm text-[var(--muted)]">None logged.</p>
              )}
            </Card>
          );
        })}
      </div>
      {ws.canWrite ? (
        <Card className="h-fit">
          <CardHeader title="Log an item" />
          <form action={createRaid} className="space-y-3 p-5">
            <input type="hidden" name="project_id" value={projectId} />
            <Field label="Type">
              <Select name="kind" defaultValue="risk">
                {kinds.map((k) => <option key={k} value={k}>{k[0]!.toUpperCase() + k.slice(1)}</option>)}
              </Select>
            </Field>
            <Field label="Title"><Input name="title" required /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Probability (1–5)"><Input type="number" name="probability" min={1} max={5} /></Field>
              <Field label="Impact (1–5)"><Input type="number" name="impact" min={1} max={5} /></Field>
            </div>
            <Field label="Owner"><Input name="owner" /></Field>
            <Field label="Due"><Input type="date" name="due_date" /></Field>
            <Field label="Details"><Textarea name="description" rows={3} /></Field>
            <SubmitButton className="w-full">Add</SubmitButton>
          </form>
        </Card>
      ) : null}
    </div>
  );
}
