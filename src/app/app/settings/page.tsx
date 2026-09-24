import type { Metadata } from "next";
import Link from "next/link";
import { Wand2 } from "lucide-react";
import { getWorkspace } from "@/lib/workspace";
import { getMembers } from "@/lib/queries";
import { siteUrl } from "@/lib/env";
import { METHODOLOGIES, plural } from "@/lib/blueprint";
import { Badge, ButtonLink, Card, CardHeader, Field, Input, PageHeader, Select } from "@/components/ui";
import { AutoSubmitSelect, CopyButton, SubmitButton } from "@/components/client-ui";
import { createInvitation, deleteSampleData, removeMember, renameOrg, revokeInvitation, updateMemberRole } from "../actions/org";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const ws = await getWorkspace();
  const bp = ws.blueprint;
  const [members, { data: invites }, demoCounts] = await Promise.all([
    getMembers(ws),
    ws.isAdmin ? ws.supabase.from("invitations").select("*").eq("organization_id", ws.org.id).is("accepted_at", null).order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
    Promise.all(
      ["projects", "backlog_items", "people"].map(async (t) => (await ws.supabase.from(t).select("id", { count: "exact", head: true }).eq("organization_id", ws.org.id).eq("is_demo", true)).count ?? 0),
    ),
  ]);
  const demoTotal = demoCounts.reduce((a, b) => a + b, 0);

  return (
    <>
      <PageHeader title="Settings" subtitle={ws.org.name} />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Company" />
          <form action={renameOrg} className="flex items-end gap-3 p-5">
            <Field label="Company name" className="flex-1"><Input name="name" defaultValue={ws.org.name} disabled={!ws.isAdmin} /></Field>
            {ws.isAdmin ? <SubmitButton variant="secondary">Save</SubmitButton> : null}
          </form>
          <dl className="grid grid-cols-2 gap-3 border-t border-[var(--border)] p-5 text-sm">
            <dt className="text-[var(--muted)]">Plan</dt><dd className="capitalize text-navy-900">{ws.org.plan}</dd>
            <dt className="text-[var(--muted)]">Your role</dt><dd className="capitalize text-navy-900">{ws.role}</dd>
            <dt className="text-[var(--muted)]">Created</dt><dd className="text-navy-900">{formatDate(ws.org.created_at)}</dd>
          </dl>
        </Card>

        <Card>
          <CardHeader title="Workspace setup" subtitle="Everything the setup wizard decided." action={ws.isAdmin ? <ButtonLink href="/onboarding?rerun=1" size="sm" variant="secondary"><Wand2 className="h-4 w-4" /> Re-run wizard</ButtonLink> : null} />
          <dl className="grid grid-cols-[140px_1fr] gap-x-4 gap-y-2 p-5 text-sm">
            <dt className="text-[var(--muted)]">Method</dt><dd>{METHODOLOGIES.find((m) => m.key === bp.methodology)?.label}</dd>
            <dt className="text-[var(--muted)]">Structure</dt><dd>{[bp.levels.program.enabled && bp.levels.program.label, bp.levels.project.label, bp.levels.phase.enabled && bp.levels.phase.label, bp.levels.task.label].filter(Boolean).join(" → ")}</dd>
            <dt className="text-[var(--muted)]">{plural(bp.levels.phase.label)}</dt><dd>{bp.phaseTemplate.join(" → ") || "—"}</dd>
            <dt className="text-[var(--muted)]">Scoring</dt><dd>{bp.scoring.criteria.map((c) => `${c.label} ${c.weight}%`).join(" · ") || "—"}</dd>
            <dt className="text-[var(--muted)]">Disciplines</dt><dd>{bp.disciplines.map((d) => d.label).join(", ")}</dd>
            <dt className="text-[var(--muted)]">Fiscal year</dt><dd>Starts month {bp.company.fiscalYearStartMonth} · {bp.company.timezone}</dd>
          </dl>
        </Card>

        <Card id="members" className="xl:col-span-2">
          <CardHeader title="Members" subtitle={`${members.filter((m) => m.role !== "guest").length} users, ${members.filter((m) => m.role === "guest").length} guests`} />
          <ul className="divide-y divide-[var(--border)]">
            {members.map((m) => (
              <li key={m.user_id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-navy-900">{m.name} {m.user_id === ws.user.id ? <Badge>You</Badge> : null}</p>
                  <p className="text-xs text-[var(--muted)]">{m.email}</p>
                </div>
                {ws.isAdmin && m.role !== "owner" && m.user_id !== ws.user.id ? (
                  <>
                    <form action={updateMemberRole}>
                      <input type="hidden" name="user_id" value={m.user_id} />
                      <AutoSubmitSelect name="role" defaultValue={m.role} aria-label="Role">
                        <option value="admin">Admin</option><option value="manager">Manager</option><option value="member">Member</option><option value="guest">Guest</option>
                      </AutoSubmitSelect>
                    </form>
                    <form action={removeMember}>
                      <input type="hidden" name="user_id" value={m.user_id} />
                      <button className="text-sm text-red-600 hover:text-red-700">Remove</button>
                    </form>
                  </>
                ) : (
                  <Badge tone={m.role === "owner" ? "brand" : "neutral"}>{m.role}</Badge>
                )}
              </li>
            ))}
          </ul>
          {ws.isAdmin ? (
            <div className="border-t border-[var(--border)] p-5">
              <form action={createInvitation} className="flex flex-wrap items-end gap-3">
                <Field label="Invite by email" className="min-w-[240px] flex-1"><Input type="email" name="email" required placeholder="colleague@company.com" /></Field>
                <Field label="Role">
                  <Select name="role" defaultValue="member"><option value="admin">Admin</option><option value="manager">Manager</option><option value="member">Member</option><option value="guest">Guest (read-only)</option></Select>
                </Field>
                <SubmitButton>Create invitation</SubmitButton>
              </form>
              {invites?.length ? (
                <div className="mt-5">
                  <p className="mb-2 text-sm font-medium text-navy-900">Pending invitations: send each person their link</p>
                  <ul className="space-y-2">
                    {invites.map((i) => (
                      <li key={i.id} className="flex flex-wrap items-center gap-3 rounded-lg bg-navy-50/60 px-3 py-2 text-sm">
                        <span className="flex-1 text-navy-900">{i.email} <span className="text-[var(--muted)]">· {i.role} · expires {formatDate(i.expires_at)}</span></span>
                        <CopyButton value={`${siteUrl()}/invite/${i.token}`} />
                        <form action={revokeInvitation}>
                          <input type="hidden" name="id" value={i.id} />
                          <button className="text-sm text-red-600 hover:text-red-700">Revoke</button>
                        </form>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-[var(--muted)]">The link only works for the email address it was created for.</p>
                </div>
              ) : null}
            </div>
          ) : null}
        </Card>

        {ws.isAdmin && demoTotal ? (
          <Card className="xl:col-span-2">
            <CardHeader title="Sample data" subtitle={`${demoCounts[0]} sample projects, ${demoCounts[1]} sample requests and ${demoCounts[2]} sample people.`} />
            <form action={deleteSampleData} className="flex flex-wrap items-center justify-between gap-3 p-5">
              <p className="text-sm text-navy-700">Remove everything the wizard created as an example, including tasks inside sample projects. Your own data stays.</p>
              <SubmitButton variant="danger" pendingText="Removing…">Remove sample data</SubmitButton>
            </form>
          </Card>
        ) : null}

        <Card className="xl:col-span-2">
          <CardHeader title="Your data" />
          <div className="p-5 text-sm text-navy-700">
            Need a full export or want your company deleted? Email <a className="text-brand-600 hover:underline" href="mailto:info@gorillamec.com">info@gorillamec.com</a>. Self-service export is on the roadmap for Gold.{" "}
            <Link href="/legal/privacy" className="text-brand-600 hover:underline">Privacy policy</Link>
          </div>
        </Card>
      </div>
    </>
  );
}
