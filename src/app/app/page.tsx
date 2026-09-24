import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Sparkles, FileSpreadsheet, UserPlus, Inbox } from "lucide-react";
import { getWorkspace } from "@/lib/workspace";
import { statusCategory, plural } from "@/lib/blueprint";
import { Card, CardHeader, PageHeader, Stat, ButtonLink } from "@/components/ui";
import { HealthBadge, BacklogStatusBadge, ScorePill } from "@/components/app/badges";
import { fiscalQuarterOf } from "@/lib/fiscal";
import { backlogId, formatDate, formatShortDate, toISODate } from "@/lib/utils";
import { BACKLOG_STATUSES, type BacklogItem, type Project } from "@/lib/types";

export const metadata: Metadata = { title: "Home" };

export default async function DashboardPage({ searchParams }: PageProps<"/app">) {
  const sp = await searchParams;
  const ws = await getWorkspace();
  const bp = ws.blueprint;
  const org = ws.org.id;
  const today = toISODate(new Date());
  const portfolio = bp.modules.portfolio && ws.features.has("portfolio");
  const resources = bp.modules.resources && ws.features.has("resources");
  const governance = bp.modules.governance && ws.features.has("meetings");
  const quarter = fiscalQuarterOf(new Date(), bp.company.fiscalYearStartMonth);
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  weekStart.setHours(0, 0, 0, 0);

  const [{ data: myTasks }, { data: projects }, backlogRes, meetingsRes, allocRes, peopleRes, { data: updates }, { data: time }] = await Promise.all([
    ws.supabase.from("tasks").select("id, status, due_date").eq("organization_id", org).eq("assignee_id", ws.user.id).not("status", "in", "(completed,cancelled)"),
    ws.supabase.from("projects").select("*").eq("organization_id", org).not("status", "in", "(completed,cancelled)").is("archived_at", null),
    portfolio ? ws.supabase.from("backlog_items").select("*").eq("organization_id", org) : Promise.resolve({ data: [] as BacklogItem[] }),
    governance ? ws.supabase.from("meetings").select("id, title, starts_at, meeting_type").eq("organization_id", org).gte("starts_at", new Date().toISOString()).order("starts_at").limit(3) : Promise.resolve({ data: [] }),
    resources ? ws.supabase.from("allocations").select("person_id, hours").eq("organization_id", org).eq("quarter", quarter.key) : Promise.resolve({ data: [] }),
    resources ? ws.supabase.from("people").select("id, name, capacity_hours_per_quarter").eq("organization_id", org).eq("active", true) : Promise.resolve({ data: [] }),
    ws.supabase.from("item_updates").select("id, body, created_at, project:projects(id, name), backlog:backlog_items(id, number, title)").eq("organization_id", org).order("created_at", { ascending: false }).limit(6),
    ws.supabase.from("time_entries").select("minutes").eq("organization_id", org).eq("user_id", ws.user.id).gte("started_at", weekStart.toISOString()),
  ]);

  const backlog = (backlogRes.data ?? []) as BacklogItem[];
  const proj = (projects ?? []) as Project[];
  const overdue = (myTasks ?? []).filter((t) => t.due_date && t.due_date < today && statusCategory(t.status) !== "done").length;
  const atRisk = proj.filter((p) => p.health === "at_risk" || p.health === "behind");
  const newReq = backlog.filter((b) => b.status === "new").length;
  const decisions = backlog.filter((b) => (b.status === "ready" || b.ready_for_prioritization) && !b.committed_priority && !["cancelled", "done", "deferred"].includes(b.status));
  const undecided = proj.filter((p) => bp.modules.charters && !p.decision);
  const hours = Math.round(((time ?? []).reduce((s, t) => s + (t.minutes ?? 0), 0) / 60) * 10) / 10;
  const maxScore = bp.scoring.scale * 10 * (bp.scoring.criteria.reduce((s, c) => s + c.weight, 0) / 100);

  const load = (peopleRes.data ?? [])
    .map((p) => {
      const h = (allocRes.data ?? []).filter((a) => a.person_id === p.id).reduce((s, a) => s + Number(a.hours), 0);
      return { ...p, hours: h, pct: p.capacity_hours_per_quarter ? (h / p.capacity_hours_per_quarter) * 100 : 0 };
    })
    .filter((p) => p.pct >= 85)
    .sort((a, b) => b.pct - a.pct);

  const severity = { behind: 0, at_risk: 1, not_started: 2, on_track: 3, closed: 4 } as const;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <>
      <PageHeader eyebrow={ws.org.name} title={`${greeting}, ${ws.user.name.split(" ")[0]}`} subtitle={`${formatDate(new Date(), { weekday: "long", day: "numeric", month: "long" })} · ${quarter.label}`} />

      {sp.welcome ? (
        <Card className="mb-6 overflow-hidden border-brand-200">
          <div className="flex flex-col gap-4 bg-gradient-to-r from-brand-50 to-white p-5 sm:flex-row sm:items-center">
            <Sparkles className="h-8 w-8 shrink-0 text-brand-600" />
            <div className="flex-1">
              <p className="font-semibold text-navy-950">Your workspace is ready.</p>
              <p className="text-sm text-navy-700">Three things worth doing next:</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ButtonLink href="/app/import" variant="secondary" size="sm"><FileSpreadsheet className="h-4 w-4" /> Import your tracker</ButtonLink>
              {ws.isAdmin ? <ButtonLink href="/app/settings#members" variant="secondary" size="sm"><UserPlus className="h-4 w-4" /> Invite the team</ButtonLink> : null}
              {portfolio ? <ButtonLink href="/app/portfolio#intake" variant="secondary" size="sm"><Inbox className="h-4 w-4" /> Share the intake form</ButtonLink> : null}
            </div>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="My open work" value={(myTasks ?? []).length} hint={<Link href="/app/my-work" className="text-brand-700 hover:underline">Open My work →</Link>} />
        <Stat label="My overdue" value={overdue} tone={overdue ? "red" : "green"} />
        <Stat label={`${plural(bp.levels.project.label)} at risk`} value={`${atRisk.length}/${proj.length}`} tone={atRisk.length ? "amber" : undefined} />
        {portfolio ? <Stat label="New requests" value={newReq} hint="Waiting for triage" tone={newReq ? "amber" : undefined} /> : <Stat label="My hours this week" value={hours} />}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title={`${plural(bp.levels.project.label)} by health`} action={<Link href="/app/projects" className="text-sm text-brand-700 hover:underline">All</Link>} />
          <ul className="divide-y divide-[var(--border)]">
            {[...proj].sort((a, b) => severity[a.health] - severity[b.health]).slice(0, 8).map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <Link href={`/app/projects/${p.id}`} className="min-w-0 flex-1 truncate text-sm font-medium text-navy-900 hover:text-brand-800">{p.name}</Link>
                <span className="text-xs text-[var(--muted)]">{p.end_date ? `ends ${formatShortDate(p.end_date)}` : ""}</span>
                <span className="w-28"><HealthBadge health={p.health} /></span>
              </li>
            ))}
            {!proj.length ? <li className="px-5 py-6 text-sm text-[var(--muted)]">No active {plural(bp.levels.project.label).toLowerCase()} yet.</li> : null}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Decisions to be made" subtitle="Ready items without a commitment" />
          <ul className="divide-y divide-[var(--border)]">
            {decisions.slice(0, 5).map((b) => (
              <li key={b.id} className="flex items-center gap-3 px-5 py-3">
                <ScorePill score={b.score} max={maxScore} />
                <Link href={`/app/portfolio/${b.id}`} className="min-w-0 flex-1 truncate text-sm text-navy-900 hover:text-brand-800">
                  <span className="text-[var(--muted)]">{backlogId(b.number)}</span> {b.title}
                </Link>
              </li>
            ))}
            {undecided.slice(0, 5 - Math.min(5, decisions.length)).map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-5 py-3">
                <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">Decide</span>
                <Link href={`/app/projects/${p.id}`} className="min-w-0 flex-1 truncate text-sm text-navy-900 hover:text-brand-800">{p.name}</Link>
              </li>
            ))}
            {!decisions.length && !undecided.length ? <li className="px-5 py-6 text-sm text-[var(--muted)]">Nothing waiting on a decision.</li> : null}
          </ul>
        </Card>

        {portfolio ? (
          <Card>
            <CardHeader title="Portfolio funnel" action={<Link href="/app/portfolio" className="text-sm text-brand-700 hover:underline">Backlog</Link>} />
            <div className="space-y-2 p-5">
              {BACKLOG_STATUSES.map((s) => {
                const n = backlog.filter((b) => b.status === s.key).length;
                if (!n) return null;
                return (
                  <div key={s.key} className="flex items-center gap-3 text-sm">
                    <span className="w-40"><BacklogStatusBadge status={s.key} /></span>
                    <div className="h-2 flex-1 rounded-full bg-navy-50">
                      <div className="h-2 rounded-full bg-navy-700" style={{ width: `${(n / Math.max(1, backlog.length)) * 100}%` }} />
                    </div>
                    <span className="w-8 text-right tabular-nums text-navy-900">{n}</span>
                  </div>
                );
              })}
              {!backlog.length ? <p className="text-sm text-[var(--muted)]">No requests yet. Share your intake form to start.</p> : null}
            </div>
          </Card>
        ) : null}

        {resources ? (
          <Card>
            <CardHeader title={`Capacity hot spots · ${quarter.short}`} action={<Link href="/app/capacity" className="text-sm text-brand-700 hover:underline">Capacity</Link>} />
            <ul className="divide-y divide-[var(--border)]">
              {load.slice(0, 5).map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                  <span className="flex-1 text-navy-900">{p.name}</span>
                  <span className={p.pct > 100 ? "font-semibold text-red-600" : "font-medium text-amber-600"}>{Math.round(p.pct)}%</span>
                </li>
              ))}
              {!load.length ? <li className="px-5 py-6 text-sm text-[var(--muted)]">Nobody above 85% this quarter.</li> : null}
            </ul>
          </Card>
        ) : null}

        {governance ? (
          <Card>
            <CardHeader title="Upcoming meetings" action={<Link href="/app/meetings" className="text-sm text-brand-700 hover:underline">All</Link>} />
            <ul className="divide-y divide-[var(--border)]">
              {(meetingsRes.data ?? []).map((m) => (
                <li key={m.id}>
                  <Link href={`/app/meetings/${m.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-navy-50/40">
                    <span className="w-24 text-sm font-medium text-navy-900">
                      {new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: bp.company.timezone }).format(new Date(m.starts_at))}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-navy-700">{m.title}</span>
                    <ArrowRight className="h-4 w-4 text-navy-300" />
                  </Link>
                </li>
              ))}
              {!meetingsRes.data?.length ? <li className="px-5 py-6 text-sm text-[var(--muted)]">No meetings scheduled.</li> : null}
            </ul>
          </Card>
        ) : null}

        <Card className={portfolio && resources && governance ? "xl:col-span-3" : ""}>
          <CardHeader title="Latest updates" />
          <ul className="divide-y divide-[var(--border)]">
            {(updates ?? []).map((u) => {
              const row = u as unknown as { id: string; body: string; created_at: string; project: { id: string; name: string } | null; backlog: { id: string; number: number; title: string } | null };
              return (
                <li key={row.id} className="px-5 py-3">
                  <p className="text-xs text-[var(--muted)]">
                    {formatDate(row.created_at)} ·{" "}
                    {row.project ? <Link href={`/app/projects/${row.project.id}`} className="hover:text-navy-900">{row.project.name}</Link> : row.backlog ? <Link href={`/app/portfolio/${row.backlog.id}`} className="hover:text-navy-900">{backlogId(row.backlog.number)} {row.backlog.title}</Link> : null}
                  </p>
                  <p className="mt-0.5 text-sm text-navy-900">{row.body}</p>
                </li>
              );
            })}
            {!updates?.length ? <li className="px-5 py-6 text-sm text-[var(--muted)]">Updates you add to projects and requests appear here.</li> : null}
          </ul>
        </Card>
      </div>
    </>
  );
}
