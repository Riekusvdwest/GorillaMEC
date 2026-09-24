import type { Metadata } from "next";
import Link from "next/link";
import { FolderKanban, Plus } from "lucide-react";
import { getWorkspace } from "@/lib/workspace";
import { plural, statusCategory } from "@/lib/blueprint";
import { PageHeader, Card, EmptyState, Progress, Field, Input, Select, Badge } from "@/components/ui";
import { Modal, SubmitButton } from "@/components/client-ui";
import { HealthBadge } from "@/components/app/badges";
import { createProject } from "../actions/work";
import { formatDate, formatMoney } from "@/lib/utils";
import { PROJECT_STATUS, type Project } from "@/lib/types";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage({ searchParams }: PageProps<"/app/projects">) {
  const sp = await searchParams;
  const ws = await getWorkspace();
  const bp = ws.blueprint;
  const showClosed = sp.show === "all";

  let q = ws.supabase.from("projects").select("*").eq("organization_id", ws.org.id).is("archived_at", null).order("created_at", { ascending: false });
  if (!showClosed) q = q.not("status", "in", "(completed,cancelled)");
  const [{ data: projects }, { data: tasks }, { data: programs }] = await Promise.all([
    q,
    ws.supabase.from("tasks").select("project_id, status, due_date").eq("organization_id", ws.org.id).not("project_id", "is", null),
    ws.supabase.from("programs").select("id, name").eq("organization_id", ws.org.id).order("name"),
  ]);
  const list = (projects ?? []) as Project[];
  const label = bp.levels.project.label;
  const today = new Date().toISOString().slice(0, 10);

  const stats = (id: string) => {
    const t = (tasks ?? []).filter((x) => x.project_id === id);
    const done = t.filter((x) => statusCategory(x.status) === "done").length;
    const overdue = t.filter((x) => statusCategory(x.status) !== "done" && x.due_date && x.due_date < today).length;
    return { total: t.length, done, overdue, pct: t.length ? (done / t.length) * 100 : 0 };
  };

  const byProgram = new Map<string | null, Project[]>();
  for (const p of list) {
    const key = bp.levels.program.enabled ? p.program_id : null;
    byProgram.set(key, [...(byProgram.get(key) ?? []), p]);
  }

  return (
    <>
      <PageHeader
        title={plural(label)}
        subtitle={`${list.length} ${showClosed ? "" : "open "}${plural(label).toLowerCase()}`}
        actions={
          <>
            <Link href={showClosed ? "/app/projects" : "/app/projects?show=all"} className="text-sm text-[var(--muted)] hover:text-navy-900">
              {showClosed ? "Hide closed" : "Show closed"}
            </Link>
            {ws.canWrite ? (
              <Modal title={`New ${label.toLowerCase()}`} trigger={<><Plus className="h-4 w-4" /> New {label.toLowerCase()}</>}>
                <form action={createProject} className="space-y-4">
                  <Field label="Name">
                    <Input name="name" required autoFocus />
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {bp.categories.length ? (
                      <Field label="Category">
                        <Select name="category" defaultValue="">
                          <option value="">—</option>
                          {bp.categories.map((c) => <option key={c}>{c}</option>)}
                        </Select>
                      </Field>
                    ) : null}
                    <Field label="Site / location">
                      {bp.sites.length ? (
                        <Select name="site" defaultValue="">
                          <option value="">—</option>
                          {bp.sites.map((c) => <option key={c}>{c}</option>)}
                        </Select>
                      ) : (
                        <Input name="site" />
                      )}
                    </Field>
                    {bp.levels.program.enabled && programs?.length ? (
                      <Field label={bp.levels.program.label}>
                        <Select name="program_id" defaultValue="">
                          <option value="">—</option>
                          {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </Select>
                      </Field>
                    ) : null}
                    <Field label="Method">
                      <Select name="methodology" defaultValue={bp.methodology === "hybrid" ? "waterfall" : bp.methodology}>
                        <option value="waterfall">Waterfall</option>
                        <option value="scrum">Scrum</option>
                        <option value="kanban">Kanban</option>
                        <option value="tasks">Task list</option>
                      </Select>
                    </Field>
                    <Field label="Start">
                      <Input type="date" name="start_date" />
                    </Field>
                    <Field label="End">
                      <Input type="date" name="end_date" />
                    </Field>
                  </div>
                  {bp.levels.phase.enabled && bp.phaseTemplate.length ? (
                    <label className="flex items-center gap-2 text-sm text-navy-800">
                      <input type="checkbox" name="use_template" defaultChecked className="h-4 w-4 accent-brand-500" />
                      Add {plural(bp.levels.phase.label).toLowerCase()}: {bp.phaseTemplate.join(" → ")}
                    </label>
                  ) : null}
                  <div className="flex justify-end">
                    <SubmitButton pendingText="Creating…">Create {label.toLowerCase()}</SubmitButton>
                  </div>
                </form>
              </Modal>
            ) : null}
          </>
        }
      />

      {!list.length ? (
        <EmptyState icon={<FolderKanban className="h-10 w-10" />} title={`No ${plural(label).toLowerCase()} yet`} body={`Create your first ${label.toLowerCase()}, convert a committed backlog item, or import from Excel.`} />
      ) : (
        <div className="space-y-6">
          {[...byProgram.entries()].map(([programId, items]) => (
            <Card key={programId ?? "none"} className="overflow-hidden">
              {bp.levels.program.enabled ? (
                <div className="border-b border-[var(--border)] bg-navy-50/50 px-5 py-2.5 text-sm font-semibold text-navy-800">
                  {programs?.find((p) => p.id === programId)?.name ?? `No ${bp.levels.program.label.toLowerCase()}`}
                </div>
              ) : null}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead className="text-xs uppercase tracking-wider text-[var(--muted)]">
                    <tr className="border-b border-[var(--border)]">
                      <th className="px-5 py-2.5 font-medium">{label}</th>
                      <th className="px-3 py-2.5 font-medium">Health</th>
                      <th className="px-3 py-2.5 font-medium">Status</th>
                      <th className="px-3 py-2.5 font-medium">Dates</th>
                      <th className="px-3 py-2.5 font-medium">Progress</th>
                      {bp.modules.charters ? <th className="px-3 py-2.5 text-right font-medium">Budget</th> : null}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {items.map((p) => {
                      const s = stats(p.id);
                      return (
                        <tr key={p.id} className="hover:bg-navy-50/40">
                          <td className="px-5 py-3">
                            <Link href={`/app/projects/${p.id}`} className="font-medium text-navy-950 hover:text-brand-800">
                              {p.code ? <span className="mr-2 text-[var(--muted)]">{p.code}</span> : null}
                              {p.name}
                            </Link>
                            <div className="mt-0.5 flex flex-wrap gap-1.5 text-xs text-[var(--muted)]">
                              {p.category ? <span>{p.category}</span> : null}
                              {p.site ? <span>· {p.site}</span> : null}
                              {p.is_demo ? <Badge tone="neutral">Sample</Badge> : null}
                            </div>
                          </td>
                          <td className="px-3 py-3"><HealthBadge health={p.health} /></td>
                          <td className="px-3 py-3 text-navy-700">{PROJECT_STATUS.find((x) => x.key === p.status)?.label}</td>
                          <td className="px-3 py-3 whitespace-nowrap text-navy-700">
                            {formatDate(p.start_date, { day: "numeric", month: "short" })} – {formatDate(p.end_date)}
                          </td>
                          <td className="w-48 px-3 py-3">
                            <Progress value={s.pct} />
                            <p className="mt-1 text-xs text-[var(--muted)]">
                              {s.done}/{s.total} done{s.overdue ? <span className="text-red-600"> · {s.overdue} overdue</span> : null}
                            </p>
                          </td>
                          {bp.modules.charters ? (
                            <td className="px-3 py-3 text-right tabular-nums text-navy-800">
                              {formatMoney(p.budget_current ?? p.budget_original, bp.company.currency)}
                              {p.budget_original && p.budget_current && p.budget_current !== p.budget_original ? (
                                <p className={`text-xs ${p.budget_current > p.budget_original ? "text-red-600" : "text-emerald-600"}`}>
                                  {p.budget_current > p.budget_original ? "+" : ""}
                                  {Math.round(((p.budget_current - p.budget_original) / p.budget_original) * 100)}% vs baseline
                                </p>
                              ) : null}
                            </td>
                          ) : null}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
