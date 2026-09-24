import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Inbox, Plus, ExternalLink } from "lucide-react";
import { getWorkspace } from "@/lib/workspace";
import { siteUrl } from "@/lib/env";
import { Card, CardHeader, EmptyState, Field, Input, PageHeader, Select, Textarea, Badge } from "@/components/ui";
import { CopyButton, Modal, SubmitButton } from "@/components/client-ui";
import { BacklogStatusBadge, RagDot, ScorePill } from "@/components/app/badges";
import { createBacklogItem, setIntakeForm } from "../actions/portfolio";
import { upcomingQuarters, quarterByKey } from "@/lib/fiscal";
import { backlogId, cn } from "@/lib/utils";
import { COMMITTED_PRIORITIES, SOURCES, type BacklogItem } from "@/lib/types";

export const metadata: Metadata = { title: "Portfolio" };

const FILTERS = [
  { key: "active", label: "Active", match: (b: BacklogItem) => !["done", "cancelled", "deferred"].includes(b.status) },
  { key: "new", label: "To triage", match: (b: BacklogItem) => b.status === "new" || b.status === "triaged" },
  { key: "ready", label: "To prioritise", match: (b: BacklogItem) => (b.status === "ready" || b.ready_for_prioritization) && !b.committed_priority },
  { key: "committed", label: "Committed", match: (b: BacklogItem) => Boolean(b.committed_priority && b.committed_priority < 4) && !["done", "cancelled"].includes(b.status) },
  { key: "deferred", label: "Deferred", match: (b: BacklogItem) => b.status === "deferred" || b.committed_priority === 4 },
  { key: "all", label: "All", match: () => true },
];

export default async function PortfolioPage({ searchParams }: PageProps<"/app/portfolio">) {
  const sp = await searchParams;
  const ws = await getWorkspace();
  if (!ws.features.has("portfolio") || !ws.blueprint.modules.portfolio) redirect("/app/billing?feature=portfolio");
  const bp = ws.blueprint;
  const filter = FILTERS.find((f) => f.key === sp.filter) ?? FILTERS[0]!;

  const [{ data }, { data: form }] = await Promise.all([
    ws.supabase.from("backlog_items").select("*").eq("organization_id", ws.org.id),
    ws.supabase.from("intake_forms").select("*").eq("organization_id", ws.org.id).limit(1).maybeSingle(),
  ]);
  const all = (data ?? []) as BacklogItem[];
  const ranked = [...all].sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || a.number - b.number);
  const rank = new Map(ranked.filter((b) => b.score !== null && !["done", "cancelled"].includes(b.status)).map((b, i) => [b.id, i + 1]));
  const items = ranked.filter(filter.match);
  const maxScore = bp.scoring.scale * 10 * (bp.scoring.criteria.reduce((s, c) => s + c.weight, 0) / 100);
  const quarters = upcomingQuarters(new Date(), bp.company.fiscalYearStartMonth, 4);
  const formUrl = form ? `${siteUrl()}/f/${form.slug}` : null;

  return (
    <>
      <PageHeader
        title="Portfolio backlog"
        subtitle={bp.priorityModel === "weighted" && bp.scoring.criteria.length ? `Ranked by weighted score: ${bp.scoring.criteria.map((c) => `${c.label} ${c.weight}%`).join(" · ")}` : "Every request in one place"}
        actions={
          ws.canWrite ? (
            <Modal title="New request" trigger={<><Plus className="h-4 w-4" /> New request</>}>
              <form action={createBacklogItem} className="space-y-4">
                <Field label="Title"><Input name="title" required autoFocus /></Field>
                <Field label="Description"><Textarea name="description" rows={3} /></Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Source">
                    <Select name="source" defaultValue="internal">{SOURCES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</Select>
                  </Field>
                  <Field label="Business impact">
                    <Select name="business_impact" defaultValue=""><option value="">—</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></Select>
                  </Field>
                  <Field label="Site"><Input name="site" /></Field>
                  <Field label="Target quarter">
                    <Select name="target_quarter" defaultValue=""><option value="">—</option>{quarters.map((q) => <option key={q.key} value={q.key}>{q.label}</option>)}</Select>
                  </Field>
                </div>
                <div className="flex justify-end"><SubmitButton>Create</SubmitButton></div>
              </form>
            </Modal>
          ) : null
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div>
          <nav className="mb-4 flex flex-wrap gap-1" aria-label="Filter">
            {FILTERS.map((f) => {
              const n = all.filter(f.match).length;
              return (
                <Link
                  key={f.key}
                  href={`/app/portfolio?filter=${f.key}`}
                  className={cn("rounded-full px-3 py-1.5 text-sm", f.key === filter.key ? "bg-navy-900 text-white" : "bg-white text-navy-700 ring-1 ring-[var(--border)] hover:ring-navy-300")}
                >
                  {f.label} <span className={f.key === filter.key ? "text-navy-300" : "text-[var(--muted)]"}>{n}</span>
                </Link>
              );
            })}
          </nav>
          {!items.length ? (
            <EmptyState icon={<Inbox className="h-10 w-10" />} title="Nothing here" body="Requests raised through the intake form or added here appear in this list, ranked by score." />
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wider text-[var(--muted)]">
                  <tr className="border-b border-[var(--border)]">
                    <th className="px-4 py-2.5 font-medium">Rank</th>
                    <th className="px-3 py-2.5 font-medium">Request</th>
                    <th className="px-3 py-2.5 font-medium">Status</th>
                    <th className="px-3 py-2.5 font-medium">Score</th>
                    <th className="px-3 py-2.5 font-medium">Commit</th>
                    <th className="px-3 py-2.5 font-medium">Quarter</th>
                    <th className="px-3 py-2.5 font-medium">Done</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {items.map((b) => (
                    <tr key={b.id} className="hover:bg-navy-50/40">
                      <td className="px-4 py-3 font-display text-base font-semibold tabular-nums text-navy-300">{rank.get(b.id) ?? "–"}</td>
                      <td className="px-3 py-3">
                        <Link href={`/app/portfolio/${b.id}`} className="flex items-center gap-2 font-medium text-navy-950 hover:text-brand-700">
                          <RagDot rag={b.rag} />
                          <span className="text-[var(--muted)]">{backlogId(b.number)}</span>
                          <span className="truncate">{b.title}</span>
                        </Link>
                        <p className="mt-0.5 pl-4 text-xs text-[var(--muted)]">
                          {[SOURCES.find((s) => s.key === b.source)?.label, b.site, b.business_impact ? `${b.business_impact} impact` : null].filter(Boolean).join(" · ")}
                          {b.is_demo ? <Badge className="ml-2">Sample</Badge> : null}
                        </p>
                      </td>
                      <td className="px-3 py-3"><BacklogStatusBadge status={b.status} /></td>
                      <td className="px-3 py-3"><ScorePill score={b.score} max={maxScore} /></td>
                      <td className="px-3 py-3 text-navy-800">{COMMITTED_PRIORITIES.find((c) => c.value === b.committed_priority)?.label.split(" – ")[1] ?? <span className="text-navy-300">—</span>}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-navy-800">{quarterByKey(b.committed_quarter ?? b.target_quarter, bp.company.fiscalYearStartMonth)?.short ?? "—"}</td>
                      <td className="px-3 py-3 tabular-nums text-navy-700">{b.percent_complete}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>

        <Card id="intake" className="h-fit">
          <CardHeader title="Intake form" subtitle="Anyone with the link can raise a request." />
          <div className="space-y-4 p-5">
            {formUrl ? (
              <>
                <div className="break-all rounded-lg bg-navy-50 px-3 py-2 font-mono text-xs text-navy-800">{formUrl}</div>
                <div className="flex gap-2">
                  <CopyButton value={formUrl} />
                  <a href={`/f/${form!.slug}`} target="_blank" className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm text-navy-700 hover:bg-navy-50">
                    <ExternalLink className="h-4 w-4" /> Open
                  </a>
                </div>
              </>
            ) : (
              <p className="text-sm text-[var(--muted)]">No form yet. Save below to create one.</p>
            )}
            {ws.canWrite ? (
              <form action={setIntakeForm} className="space-y-3 border-t border-[var(--border)] pt-4">
                <Field label="Form title"><Input name="title" defaultValue={form?.title ?? "Raise a request"} /></Field>
                <Field label="Intro text"><Textarea name="description" rows={2} defaultValue={form?.description ?? ""} placeholder="What should people include?" /></Field>
                <label className="flex items-center gap-2 text-sm text-navy-800">
                  <input type="checkbox" name="active" defaultChecked={form ? form.active : true} className="h-4 w-4 accent-brand-500" /> Accepting requests
                </label>
                <SubmitButton variant="secondary" size="sm">Save form</SubmitButton>
              </form>
            ) : null}
            {bp.governance.intakeCutoffHours ? <p className="text-xs text-[var(--muted)]">Requests must arrive {bp.governance.intakeCutoffHours} h before a governance meeting to be on its agenda.</p> : null}
          </div>
        </Card>
      </div>
    </>
  );
}

