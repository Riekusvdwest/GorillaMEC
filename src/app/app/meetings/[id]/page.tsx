import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Mail } from "lucide-react";
import { getWorkspace } from "@/lib/workspace";
import { Card, CardHeader, Field, Input, Textarea, Badge } from "@/components/ui";
import { CopyButton, SubmitButton } from "@/components/client-ui";
import { BacklogStatusBadge, ScorePill, HealthBadge } from "@/components/app/badges";
import { saveMeetingNotes, deleteMeeting } from "../../actions/meetings";
import { backlogId, formatDate } from "@/lib/utils";
import { BACKLOG_STATUSES, type BacklogItem, type Meeting, type Project } from "@/lib/types";
import { fiscalQuarterOf } from "@/lib/fiscal";

export const metadata: Metadata = { title: "Meeting" };

function isoWeek(d: Date) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - y0.getTime()) / 86_400_000 + 1) / 7);
}

function AgendaSection({ title, list, empty, maxScore }: { title: string; list: BacklogItem[]; empty: string; maxScore: number }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-navy-900">{title} <span className="font-normal text-[var(--muted)]">{list.length}</span></h3>
      {list.length ? (
        <ul className="space-y-1.5">
          {list.map((b) => (
            <li key={b.id} className="flex items-center gap-2 text-sm">
              <ScorePill score={b.score} max={maxScore} />
              <Link href={`/app/portfolio/${b.id}`} className="min-w-0 flex-1 truncate text-navy-900 hover:text-brand-700">
                <span className="text-[var(--muted)]">{backlogId(b.number)}</span> {b.title}
              </Link>
              <BacklogStatusBadge status={b.status} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-[var(--muted)]">{empty}</p>
      )}
    </div>
  );
}

export default async function MeetingPage({ params }: PageProps<"/app/meetings/[id]">) {
  const { id } = await params;
  const ws = await getWorkspace();
  const bp = ws.blueprint;
  const tz = bp.company.timezone;
  const { data } = await ws.supabase.from("meetings").select("*").eq("id", id).eq("organization_id", ws.org.id).maybeSingle();
  if (!data) notFound();
  const m = data as Meeting;
  const at = new Date(m.starts_at);

  const { data: prev } = await ws.supabase
    .from("meetings")
    .select("starts_at")
    .eq("organization_id", ws.org.id)
    .eq("series", m.series ?? m.title)
    .lt("starts_at", m.starts_at)
    .order("starts_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const since = prev ? new Date(prev.starts_at) : new Date(at.getTime() - 14 * 86_400_000);
  const cutoff = new Date(at.getTime() - (bp.governance.intakeCutoffHours || 0) * 3600_000);

  const portfolio = ws.features.has("portfolio") && bp.modules.portfolio;
  const [{ data: items }, { data: projects }, { data: allocs }, { data: updates }] = await Promise.all([
    portfolio ? ws.supabase.from("backlog_items").select("*").eq("organization_id", ws.org.id) : Promise.resolve({ data: [] as BacklogItem[] }),
    ws.supabase.from("projects").select("*").eq("organization_id", ws.org.id).not("status", "in", "(completed,cancelled)"),
    portfolio ? ws.supabase.from("allocations").select("backlog_item_id").eq("organization_id", ws.org.id) : Promise.resolve({ data: [] }),
    ws.supabase
      .from("item_updates")
      .select("body, created_at, backlog:backlog_items(number, title, status), project:projects(name, health)")
      .eq("organization_id", ws.org.id)
      .gte("created_at", since.toISOString())
      .lte("created_at", new Date(Math.max(at.getTime(), new Date().getTime())).toISOString())
      .order("created_at"),
  ]);
  const bl = (items ?? []) as BacklogItem[];
  const proj = (projects ?? []) as Project[];
  const maxScore = bp.scoring.scale * 10 * (bp.scoring.criteria.reduce((s, c) => s + c.weight, 0) / 100);
  const allocated = new Set((allocs ?? []).map((a) => a.backlog_item_id));

  const newItems = bl.filter((b) => (b.status === "new" || b.status === "triaged") && new Date(b.created_at) <= cutoff);
  const late = bl.filter((b) => b.status === "new" && new Date(b.created_at) > cutoff && new Date(b.created_at) <= at);
  const ready = bl.filter((b) => (b.status === "ready" || b.ready_for_prioritization) && !b.committed_priority && !["done", "cancelled", "deferred"].includes(b.status)).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const needAlloc = bl.filter((b) => b.committed_priority && b.committed_priority < 4 && !allocated.has(b.id) && !["done", "cancelled"].includes(b.status));
  const blocked = bl.filter((b) => b.status === "blocked" || b.rag === "high");
  const troubled = proj.filter((p) => p.health === "behind" || p.health === "at_risk");

  type U = { body: string; created_at: string; backlog: { number: number; title: string; status: BacklogItem["status"] } | null; project: { name: string; health: Project["health"] } | null };
  const ups = (updates ?? []) as unknown as U[];
  const quarter = fiscalQuarterOf(at, bp.company.fiscalYearStartMonth);
  const dateLabel = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: tz }).format(at);
  const subject = `Week ${isoWeek(at)} ${m.title.split(" — ")[0]} – update and open items (${dateLabel})`;
  const lines: string[] = [
    "Dear stakeholders,",
    "",
    `Please find below the week ${isoWeek(at)} update from ${m.title.split(" — ")[0].toLowerCase()}, based on the notes recorded since ${formatDate(since)}.`,
    "",
  ];
  if (ups.length) {
    lines.push("Updates");
    for (const u of ups) {
      const label = u.backlog
        ? `${backlogId(u.backlog.number)} — ${u.backlog.title} (${BACKLOG_STATUSES.find((s) => s.key === u.backlog!.status)?.label})`
        : u.project
          ? `${u.project.name}`
          : "General";
      lines.push(`• ${label}: ${u.body.replace(/\s+/g, " ").trim()}`);
    }
    lines.push("");
  }
  const openNew = bl.filter((b) => b.status === "new");
  if (openNew.length) {
    lines.push("Open items that still need an owner or triage");
    for (const b of openNew) lines.push(`• ${backlogId(b.number)} — ${b.title}`);
    lines.push("");
  }
  if (troubled.length) {
    lines.push("Projects needing attention");
    for (const p of troubled) lines.push(`• ${p.name} — ${p.health === "behind" ? "behind schedule" : "at risk"}`);
    lines.push("");
  }
  lines.push("Kind regards,", ws.user.name);
  const email = lines.join("\n");

  const ro = !ws.canWrite;
  return (
    <>
      <Link href="/app/meetings" className="text-sm text-[var(--muted)] hover:text-navy-900">← Meetings</Link>
      <div className="mt-2 mb-6">
        <h1 className="text-2xl font-semibold text-navy-950">{m.title}</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: tz }).format(at)} · {m.duration_minutes} min · {quarter.label}{" "}
          <Badge tone={m.meeting_type === "governance" ? "brand" : "neutral"} className="ml-1">{m.meeting_type}</Badge>
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Agenda, built from the portfolio" subtitle={portfolio ? `Requests after ${formatDate(cutoff, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} roll to the next meeting.` : "Projects needing attention."} />
            <div className="space-y-6 p-5">
              {portfolio && (m.meeting_type === "governance" || m.meeting_type === "planning") ? (
                <>
                  <AgendaSection title="1. New requests to triage" list={newItems} empty="No new requests." maxScore={maxScore} />
                  <AgendaSection title="2. Ready for prioritisation, highest score first" list={ready} empty="Nothing waiting for a decision." maxScore={maxScore} />
                  <AgendaSection title="3. Committed but not resourced" list={needAlloc} empty="Every committed item has hours allocated." maxScore={maxScore} />
                  {late.length ? <AgendaSection title="Arrived after the cut-off (next meeting)" list={late} empty="" maxScore={maxScore} /> : null}
                </>
              ) : null}
              {portfolio && m.meeting_type !== "governance" ? <AgendaSection title="Blocked or high risk" list={blocked} empty="Nothing blocked." maxScore={maxScore} /> : null}
              <div>
                <h3 className="mb-2 text-sm font-semibold text-navy-900">Projects behind or at risk <span className="font-normal text-[var(--muted)]">{troubled.length}</span></h3>
                {troubled.length ? (
                  <ul className="space-y-1.5">
                    {troubled.map((p) => (
                      <li key={p.id} className="flex items-center gap-3 text-sm">
                        <Link href={`/app/projects/${p.id}`} className="min-w-0 flex-1 truncate text-navy-900 hover:text-brand-700">{p.name}</Link>
                        <HealthBadge health={p.health} />
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-sm text-[var(--muted)]">All projects on track.</p>}
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Notes" />
            <form action={saveMeetingNotes} className="space-y-4 p-5">
              <input type="hidden" name="id" value={m.id} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Chair"><Input name="chair" defaultValue={m.chair ?? ""} disabled={ro} /></Field>
                <Field label="Attendees"><Input name="attendees" defaultValue={m.attendees ?? ""} disabled={ro} /></Field>
              </div>
              <Field label="Extra agenda points"><Textarea name="agenda" rows={3} defaultValue={m.agenda ?? ""} disabled={ro} /></Field>
              <Field label="Minutes and actions"><Textarea name="minutes" rows={8} defaultValue={m.minutes ?? ""} disabled={ro} placeholder="Decisions, actions, owners, dates…" /></Field>
              {!ro ? (
                <div className="flex items-center justify-between">
                  <button formAction={deleteMeeting} className="text-sm text-red-600 hover:text-red-700">Delete meeting</button>
                  <SubmitButton pendingText="Saving…">Save notes</SubmitButton>
                </div>
              ) : null}
            </form>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader title="Stakeholder update" subtitle={`Drafted from ${ups.length} dated note${ups.length === 1 ? "" : "s"} since ${formatDate(since)}.`} />
          <div className="space-y-3 p-5">
            <Field label="Subject"><Input readOnly value={subject} /></Field>
            <Field label="Email body"><Textarea readOnly rows={18} value={email} className="font-mono text-xs" /></Field>
            <div className="flex flex-wrap gap-2">
              <CopyButton value={`${subject}\n\n${email}`} label="Copy email" />
              <a
                href={`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(email)}`}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-white px-3 text-sm text-navy-900 hover:bg-navy-50"
              >
                <Mail className="h-4 w-4" /> Open in email
              </a>
            </div>
            <p className="text-xs text-[var(--muted)]">Add dated notes on requests and projects during the week and they appear here automatically.</p>
          </div>
        </Card>
      </div>
    </>
  );
}
