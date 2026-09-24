import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Trash2 } from "lucide-react";
import { getWorkspace } from "@/lib/workspace";
import { Badge, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/client-ui";
import { BacklogStatusBadge, ScorePill } from "@/components/app/badges";
import { getPeople } from "@/lib/queries";
import { addUpdate } from "../../actions/work";
import { convertToProject, deleteAllocation, deleteBacklogItem, feedbackToBacklog, saveAllocation, setScores, updateBacklogItem } from "../../actions/portfolio";
import { upcomingQuarters, quarterByKey } from "@/lib/fiscal";
import { backlogId, cn, formatDate } from "@/lib/utils";
import { BACKLOG_STATUSES, COMMITTED_PRIORITIES, SOURCES, type Allocation, type BacklogItem } from "@/lib/types";

export const metadata: Metadata = { title: "Request" };

function Zone({ n, title, subtitle, children, tone }: { n: number; title: string; subtitle: string; children: React.ReactNode; tone: string }) {
  return (
    <Card className="overflow-hidden">
      <div className={cn("flex items-center gap-3 border-b border-[var(--border)] px-5 py-3", tone)}>
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-sm font-semibold text-navy-900 shadow-sm">{n}</span>
        <div>
          <h2 className="font-semibold text-navy-950">{title}</h2>
          <p className="text-xs text-navy-700">{subtitle}</p>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </Card>
  );
}

function YesNo({ name, value, disabled }: { name: string; value: boolean | null; disabled?: boolean }) {
  return (
    <>
      <input type="hidden" name={`${name}__present`} value="1" />
      <Select name={name} defaultValue={value === null ? "" : value ? "yes" : "no"} disabled={disabled}>
        <option value="">—</option>
        <option value="yes">Yes</option>
        <option value="no">No</option>
      </Select>
    </>
  );
}

export default async function BacklogItemPage({ params }: PageProps<"/app/portfolio/[id]">) {
  const { id } = await params;
  const ws = await getWorkspace();
  const bp = ws.blueprint;
  const { data } = await ws.supabase.from("backlog_items").select("*").eq("id", id).eq("organization_id", ws.org.id).maybeSingle();
  if (!data) notFound();
  const b = data as BacklogItem;
  const ro = !ws.canWrite;
  const quarters = upcomingQuarters(new Date(), bp.company.fiscalYearStartMonth, 4);
  const resources = ws.features.has("resources") && bp.modules.resources;

  const [people, { data: allocRows }, { data: updates }, { data: parent }, { data: children }] = await Promise.all([
    getPeople(ws),
    ws.supabase.from("allocations").select("*").eq("backlog_item_id", b.id),
    ws.supabase.from("item_updates").select("id, body, created_at").eq("backlog_item_id", b.id).order("created_at", { ascending: false }),
    b.parent_item_id ? ws.supabase.from("backlog_items").select("id, number, title").eq("id", b.parent_item_id).maybeSingle() : Promise.resolve({ data: null }),
    ws.supabase.from("backlog_items").select("id, number, title, status").eq("parent_item_id", b.id),
  ]);
  const allocs = (allocRows ?? []) as Allocation[];

  // Capacity check: everyone's committed hours in each quarter this item touches.
  const qKeys = [...new Set(allocs.map((a) => a.quarter).filter(Boolean))] as string[];
  const { data: loadRows } = qKeys.length ? await ws.supabase.from("allocations").select("person_id, quarter, hours").eq("organization_id", ws.org.id).in("quarter", qKeys) : { data: [] };
  const loadOf = (personId: string | null, q: string | null) => {
    if (!personId || !q) return null;
    const p = people.find((x) => x.id === personId);
    if (!p) return null;
    const h = (loadRows ?? []).filter((r) => r.person_id === personId && r.quarter === q).reduce((s, r) => s + Number(r.hours), 0);
    return { pct: p.capacity_hours_per_quarter ? (h / p.capacity_hours_per_quarter) * 100 : 0, h, cap: p.capacity_hours_per_quarter };
  };

  const totalWeight = bp.scoring.criteria.reduce((s, c) => s + c.weight, 0);
  const maxScore = bp.scoring.scale * 10 * (totalWeight / 100);

  return (
    <>
      <Link href="/app/portfolio" className="text-sm text-[var(--muted)] hover:text-navy-900">← Portfolio</Link>
      <div className="mt-2 mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--muted)]">{backlogId(b.number)} · raised {formatDate(b.created_at)}{b.requestor_name ? ` by ${b.requestor_name}` : ""}</p>
          <h1 className="mt-1 text-2xl font-semibold text-navy-950">{b.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <BacklogStatusBadge status={b.status} />
            <ScorePill score={b.score} max={maxScore} />
            {b.committed_priority ? <Badge tone="navy">{COMMITTED_PRIORITIES.find((c) => c.value === b.committed_priority)?.label}</Badge> : null}
            {b.committed_quarter ? <Badge>{quarterByKey(b.committed_quarter, bp.company.fiscalYearStartMonth)?.short}</Badge> : null}
            {b.is_demo ? <Badge>Sample</Badge> : null}
          </div>
        </div>
        <div className="flex gap-2">
          {b.project_id ? (
            <Link href={`/app/projects/${b.project_id}`} className="inline-flex h-10 items-center gap-2 rounded-lg bg-navy-900 px-4 text-sm font-medium text-white hover:bg-navy-800">
              Open project <ArrowRight className="h-4 w-4" />
            </Link>
          ) : !ro ? (
            <form action={convertToProject}>
              <input type="hidden" name="id" value={b.id} />
              <SubmitButton pendingText="Creating…">Convert to {bp.levels.project.label.toLowerCase()}</SubmitButton>
            </form>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Zone n={1} title="Identify" subtitle="What is being asked, by whom, and why." tone="bg-sky-50">
          <form action={updateBacklogItem} className="grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="id" value={b.id} />
            <Field label="Title" className="sm:col-span-2"><Input name="title" defaultValue={b.title} disabled={ro} /></Field>
            <Field label="Description" className="sm:col-span-2"><Textarea name="description" rows={3} defaultValue={b.description ?? ""} disabled={ro} /></Field>
            <Field label="Justification" className="sm:col-span-2"><Textarea name="justification" rows={2} defaultValue={b.justification ?? ""} disabled={ro} /></Field>
            <Field label="Source">
              <Select name="source" defaultValue={b.source} disabled={ro}>{SOURCES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</Select>
            </Field>
            <Field label="Business impact">
              <Select name="business_impact" defaultValue={b.business_impact ?? ""} disabled={ro}><option value="">—</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></Select>
            </Field>
            <Field label="Requestor"><Input name="requestor_name" defaultValue={b.requestor_name ?? ""} disabled={ro} /></Field>
            <Field label="Requestor email"><Input name="requestor_email" type="email" defaultValue={b.requestor_email ?? ""} disabled={ro} /></Field>
            <Field label="Site"><Input name="site" defaultValue={b.site ?? ""} disabled={ro} /></Field>
            <Field label="Category">
              {bp.categories.length ? (
                <Select name="category" defaultValue={b.category ?? ""} disabled={ro}><option value="">—</option>{[...new Set([...bp.categories, ...(b.category ? [b.category] : [])])].map((c) => <option key={c}>{c}</option>)}</Select>
              ) : <Input name="category" defaultValue={b.category ?? ""} disabled={ro} />}
            </Field>
            <Field label="Target quarter">
              <Select name="target_quarter" defaultValue={b.target_quarter ?? ""} disabled={ro}><option value="">—</option>{quarters.map((q) => <option key={q.key} value={q.key}>{q.label}</option>)}</Select>
            </Field>
            <Field label="Downtime required?"><YesNo name="downtime_required" value={b.downtime_required} disabled={ro} /></Field>
            <Field label="Dependencies" className="sm:col-span-2"><Input name="dependencies" defaultValue={b.dependencies ?? ""} disabled={ro} /></Field>
            <Field label="Suggested solution" className="sm:col-span-2"><Textarea name="suggested_solution" rows={2} defaultValue={b.suggested_solution ?? ""} disabled={ro} /></Field>
            <Field label="External link"><Input name="external_link" defaultValue={b.external_link ?? ""} disabled={ro} placeholder="Ticket, work item or document" /></Field>
            <Field label="Status">
              <Select name="status" defaultValue={b.status} disabled={ro}>{BACKLOG_STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</Select>
            </Field>
            {!ro ? <div className="flex justify-end sm:col-span-2"><SubmitButton pendingText="Saving…">Save</SubmitButton></div> : null}
          </form>
        </Zone>

        <div className="space-y-6">
          <Zone n={2} title="Prioritise" subtitle={bp.priorityModel === "weighted" ? "Score the impact if this is NOT done." : "Set the priority."} tone="bg-violet-50">
            {bp.scoring.criteria.length ? (
              <form action={setScores} className="space-y-3">
                <input type="hidden" name="id" value={b.id} />
                {bp.scoring.criteria.map((c) => (
                  <fieldset key={c.key} className="flex flex-wrap items-center justify-between gap-2">
                    <legend className="sr-only">{c.label}</legend>
                    <span className="text-sm font-medium text-navy-900">
                      {c.label} <span className="font-normal text-[var(--muted)]">· {c.weight}%</span>
                    </span>
                    <span className="flex gap-1">
                      {Array.from({ length: bp.scoring.scale }, (_, i) => i + 1).map((v) => (
                        <label key={v} className="cursor-pointer">
                          <input type="radio" name={`score_${c.key}`} value={v} defaultChecked={b.scores?.[c.key] === v} className="peer sr-only" disabled={ro} />
                          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] text-sm font-medium text-navy-700 peer-checked:border-brand-500 peer-checked:bg-brand-500 peer-checked:text-navy-950 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500">
                            {v}
                          </span>
                        </label>
                      ))}
                    </span>
                  </fieldset>
                ))}
                <div className="flex items-center justify-between border-t border-[var(--border)] pt-3">
                  <p className="text-sm text-[var(--muted)]">
                    Score <span className="font-semibold text-navy-950">{b.score ?? "—"}</span> of {maxScore}
                  </p>
                  {!ro ? <SubmitButton size="sm" variant="secondary">Save scores</SubmitButton> : null}
                </div>
              </form>
            ) : (
              <p className="text-sm text-[var(--muted)]">No scoring criteria set. Add them by re-running the setup wizard (Settings → Workspace setup).</p>
            )}
            <form action={updateBacklogItem} className="mt-4 flex items-center gap-2 border-t border-[var(--border)] pt-4">
              <input type="hidden" name="id" value={b.id} />
              <input type="hidden" name="ready__present" value="1" />
              <label className="flex flex-1 items-center gap-2 text-sm text-navy-800">
                <input type="checkbox" name="ready_for_prioritization" defaultChecked={b.ready_for_prioritization} className="h-4 w-4 accent-brand-500" disabled={ro} />
                Ready for prioritisation (scope, estimate and owner are clear)
              </label>
              {!ro ? <SubmitButton size="sm" variant="ghost">Save</SubmitButton> : null}
            </form>
          </Zone>

          <Zone n={3} title="Allocate" subtitle="Commit it, name leads per discipline, estimate hours." tone="bg-amber-50">
            <form action={updateBacklogItem} className="grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="id" value={b.id} />
              <Field label="Committed priority">
                <Select name="committed_priority" defaultValue={b.committed_priority ?? ""} disabled={ro}><option value="">Not committed</option>{COMMITTED_PRIORITIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</Select>
              </Field>
              <Field label="Committed quarter">
                <Select name="committed_quarter" defaultValue={b.committed_quarter ?? ""} disabled={ro}><option value="">—</option>{quarters.map((q) => <option key={q.key} value={q.key}>{q.label}</option>)}</Select>
              </Field>
              <Field label="Planned start"><Input type="date" name="planned_start" defaultValue={b.planned_start ?? ""} disabled={ro} /></Field>
              <Field label="Planned end"><Input type="date" name="planned_end" defaultValue={b.planned_end ?? ""} disabled={ro} /></Field>
              {!ro ? <div className="flex justify-end sm:col-span-2"><SubmitButton size="sm" variant="secondary">Save commitment</SubmitButton></div> : null}
            </form>
            {resources ? (
              <div className="mt-5 border-t border-[var(--border)] pt-4">
                <p className="mb-2 text-sm font-medium text-navy-900">Hours by discipline</p>
                {allocs.length ? (
                  <table className="w-full text-sm">
                    <thead className="text-xs text-[var(--muted)]"><tr><th className="pb-1 text-left font-medium">Discipline</th><th className="pb-1 text-left font-medium">Lead</th><th className="pb-1 text-left font-medium">Quarter</th><th className="pb-1 text-right font-medium">Hours</th><th /></tr></thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {allocs.map((a) => {
                        const load = loadOf(a.person_id, a.quarter);
                        return (
                          <tr key={a.id}>
                            <td className="py-1.5">{bp.disciplines.find((d) => d.key === a.discipline)?.label ?? a.discipline}</td>
                            <td className="py-1.5">
                              {people.find((p) => p.id === a.person_id)?.name ?? <span className="text-navy-300">Unnamed</span>}
                              {load ? <span className={cn("ml-2 text-xs", load.pct > 100 ? "font-semibold text-red-600" : load.pct > 85 ? "text-amber-600" : "text-emerald-600")}>{Math.round(load.pct)}% of {load.cap} h</span> : null}
                            </td>
                            <td className="py-1.5">{quarterByKey(a.quarter, bp.company.fiscalYearStartMonth)?.short ?? "—"}</td>
                            <td className="py-1.5 text-right tabular-nums">{a.hours}</td>
                            <td className="py-1.5 text-right">
                              {!ro ? (
                                <form action={deleteAllocation}>
                                  <input type="hidden" name="id" value={a.id} />
                                  <input type="hidden" name="backlog_item_id" value={b.id} />
                                  <button className="text-navy-300 hover:text-red-600" aria-label="Remove"><Trash2 className="h-4 w-4" /></button>
                                </form>
                              ) : null}
                            </td>
                          </tr>
                        );
                      })}
                      <tr><td colSpan={3} className="pt-2 text-right text-xs text-[var(--muted)]">Total</td><td className="pt-2 text-right font-semibold tabular-nums">{allocs.reduce((s, a) => s + Number(a.hours), 0)}</td><td /></tr>
                    </tbody>
                  </table>
                ) : <p className="text-sm text-[var(--muted)]">No hours allocated yet.</p>}
                {!ro ? (
                  <form action={saveAllocation} className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_1fr_80px_auto]">
                    <input type="hidden" name="backlog_item_id" value={b.id} />
                    <Select name="discipline" aria-label="Discipline">{bp.disciplines.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}</Select>
                    <Select name="person_id" defaultValue="" aria-label="Lead"><option value="">Lead…</option>{people.filter((p) => p.active).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
                    <Select name="quarter" defaultValue={b.committed_quarter ?? b.target_quarter ?? quarters[0]?.key} aria-label="Quarter">{quarters.map((q) => <option key={q.key} value={q.key}>{q.short}</option>)}</Select>
                    <Input name="hours" type="number" min={0} step={1} placeholder="h" aria-label="Hours" required />
                    <SubmitButton variant="secondary">Add</SubmitButton>
                  </form>
                ) : null}
              </div>
            ) : null}
          </Zone>
        </div>

        <Zone n={4} title="Implement" subtitle="Progress, RAG and dated notes from the sprint." tone="bg-orange-50">
          <form action={updateBacklogItem} className="grid gap-3 sm:grid-cols-3">
            <input type="hidden" name="id" value={b.id} />
            <Field label="Status"><Select name="status" defaultValue={b.status} disabled={ro}>{BACKLOG_STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</Select></Field>
            <Field label="% complete"><Input type="number" name="percent_complete" min={0} max={100} step={5} defaultValue={b.percent_complete} disabled={ro} /></Field>
            <Field label="Risk (RAG)"><Select name="rag" defaultValue={b.rag} disabled={ro}><option value="none">No risk</option><option value="medium">Medium risk</option><option value="high">High risk</option></Select></Field>
            {!ro ? <div className="flex justify-end sm:col-span-3"><SubmitButton size="sm" variant="secondary">Save progress</SubmitButton></div> : null}
          </form>
          <div className="mt-5 border-t border-[var(--border)] pt-4">
            {!ro ? (
              <form action={addUpdate} className="mb-4 space-y-2">
                <input type="hidden" name="backlog_item_id" value={b.id} />
                <Textarea name="body" rows={2} className="min-h-0" placeholder="Dated note: what happened, who does what next" required />
                <div className="flex justify-end"><SubmitButton size="sm" variant="secondary">Add note</SubmitButton></div>
              </form>
            ) : null}
            <ul className="space-y-3">
              {(updates ?? []).map((u) => (
                <li key={u.id} className="border-l-2 border-brand-200 pl-3">
                  <p className="text-xs text-[var(--muted)]">{formatDate(u.created_at)}</p>
                  <p className="whitespace-pre-wrap text-sm text-navy-900">{u.body}</p>
                </li>
              ))}
              {!updates?.length ? <li className="text-sm text-[var(--muted)]">No notes yet.</li> : null}
            </ul>
          </div>
        </Zone>

        <Zone n={5} title="Monitor & control" subtitle="Did it work? What did it teach us?" tone="bg-emerald-50">
          <form action={updateBacklogItem} className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="id" value={b.id} />
            <Field label="KPI moved?"><YesNo name="kpi_moved" value={b.kpi_moved} disabled={ro} /></Field>
            <Field label="New issue raised?"><YesNo name="new_issue_raised" value={b.new_issue_raised} disabled={ro} /></Field>
            <Field label="Impact on"><Input name="pillar_impact" defaultValue={b.pillar_impact ?? ""} disabled={ro} placeholder="e.g. Reliability" /></Field>
            <Field label="Review date"><Input type="date" name="mc_date" defaultValue={b.mc_date ?? ""} disabled={ro} /></Field>
            {!ro ? <div className="flex justify-end sm:col-span-2"><SubmitButton size="sm" variant="secondary">Save</SubmitButton></div> : null}
          </form>
          <div className="mt-5 border-t border-[var(--border)] pt-4">
            <p className="text-sm font-medium text-navy-900">Feed back to the backlog</p>
            <p className="mb-2 text-xs text-[var(--muted)]">Raise a follow-up request linked to this one. It starts the loop again.</p>
            {!ro ? (
              <form action={feedbackToBacklog} className="flex gap-2">
                <input type="hidden" name="id" value={b.id} />
                <Input name="title" placeholder="Follow-up request title" required />
                <SubmitButton variant="secondary">Raise</SubmitButton>
              </form>
            ) : null}
            {parent ? <p className="mt-3 text-sm">Follows up <Link href={`/app/portfolio/${parent.id}`} className="text-brand-800 hover:underline">{backlogId(parent.number)} {parent.title}</Link></p> : null}
            {children?.length ? (
              <ul className="mt-3 space-y-1 text-sm">
                {children.map((c) => (
                  <li key={c.id}><Link href={`/app/portfolio/${c.id}`} className="text-brand-800 hover:underline">{backlogId(c.number)} {c.title}</Link></li>
                ))}
              </ul>
            ) : null}
          </div>
        </Zone>
      </div>

      {!ro && (ws.isAdmin || ws.role === "manager") ? (
        <form action={deleteBacklogItem} className="mt-8">
          <input type="hidden" name="id" value={b.id} />
          <button className="text-sm text-red-600 hover:text-red-700">Delete this request</button>
        </form>
      ) : null}
    </>
  );
}
