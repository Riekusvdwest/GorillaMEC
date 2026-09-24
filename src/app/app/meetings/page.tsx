import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarPlus } from "lucide-react";
import { getWorkspace } from "@/lib/workspace";
import { Badge, Card, Field, Input, PageHeader, Select } from "@/components/ui";
import { Modal, SubmitButton } from "@/components/client-ui";
import { createMeeting } from "../actions/meetings";
import { cn } from "@/lib/utils";
import type { Meeting } from "@/lib/types";

export const metadata: Metadata = { title: "Meetings" };

export default async function MeetingsPage({ searchParams }: PageProps<"/app/meetings">) {
  const sp = await searchParams;
  const ws = await getWorkspace();
  if (!ws.features.has("meetings") || !ws.blueprint.modules.governance) redirect("/app/billing?feature=meetings");
  const tz = ws.blueprint.company.timezone;
  const past = sp.when === "past";
  let q = ws.supabase.from("meetings").select("*").eq("organization_id", ws.org.id);
  q = past ? q.lt("starts_at", new Date().toISOString()).order("starts_at", { ascending: false }).limit(50) : q.gte("starts_at", new Date(new Date().getTime() - 3 * 3600_000).toISOString()).order("starts_at").limit(50);
  const { data } = await q;
  const meetings = (data ?? []) as Meeting[];
  const fmt = (d: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", { ...o, timeZone: tz }).format(new Date(d));

  const byMonth = new Map<string, Meeting[]>();
  for (const m of meetings) {
    const k = fmt(m.starts_at, { month: "long", year: "numeric" });
    byMonth.set(k, [...(byMonth.get(k) ?? []), m]);
  }

  return (
    <>
      <PageHeader
        title="Meetings"
        subtitle="Governance cadence with agendas built from your portfolio."
        actions={
          <>
            <div className="flex rounded-lg border border-[var(--border)] bg-white p-0.5 text-sm">
              <Link href="/app/meetings" className={cn("rounded-md px-3 py-1.5", !past ? "bg-navy-900 text-white" : "text-navy-700")}>Upcoming</Link>
              <Link href="/app/meetings?when=past" className={cn("rounded-md px-3 py-1.5", past ? "bg-navy-900 text-white" : "text-navy-700")}>Past</Link>
            </div>
            {ws.canWrite ? (
              <Modal title="Schedule a meeting" trigger={<><CalendarPlus className="h-4 w-4" /> New meeting</>}>
                <form action={createMeeting} className="space-y-4">
                  <Field label="Title"><Input name="title" required /></Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Date"><Input type="date" name="date" required /></Field>
                    <Field label="Time"><Input type="time" name="time" defaultValue="10:00" /></Field>
                    <Field label="Type">
                      <Select name="meeting_type" defaultValue="governance">
                        <option value="governance">Governance</option><option value="review">Review</option><option value="planning">Planning</option><option value="standup">Stand-up</option><option value="retro">Retro</option><option value="other">Other</option>
                      </Select>
                    </Field>
                    <Field label="Duration (min)"><Input type="number" name="duration_minutes" defaultValue={60} /></Field>
                  </div>
                  <div className="flex justify-end"><SubmitButton>Schedule</SubmitButton></div>
                </form>
              </Modal>
            ) : null}
          </>
        }
      />
      {!meetings.length ? <p className="text-sm text-[var(--muted)]">No meetings {past ? "yet" : "scheduled"}. Add series by re-running the setup wizard, or schedule one here.</p> : null}
      <div className="space-y-6">
        {[...byMonth.entries()].map(([month, list]) => (
          <section key={month}>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">{month}</h2>
            <Card>
              <ul className="divide-y divide-[var(--border)]">
                {list.map((m) => (
                  <li key={m.id}>
                    <Link href={`/app/meetings/${m.id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-navy-50/40">
                      <div className="w-14 text-center">
                        <p className="text-xs uppercase text-[var(--muted)]">{fmt(m.starts_at, { weekday: "short" })}</p>
                        <p className="font-display text-xl font-semibold text-navy-950">{fmt(m.starts_at, { day: "numeric" })}</p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-navy-900">{m.title}</p>
                        <p className="text-xs text-[var(--muted)]">{fmt(m.starts_at, { hour: "2-digit", minute: "2-digit" })} · {m.duration_minutes} min</p>
                      </div>
                      <Badge tone={m.meeting_type === "governance" ? "brand" : "neutral"}>{m.meeting_type}</Badge>
                      {m.minutes ? <Badge tone="green">Minutes</Badge> : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          </section>
        ))}
      </div>
    </>
  );
}
