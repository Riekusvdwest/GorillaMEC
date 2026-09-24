import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Trash2, UserPlus } from "lucide-react";
import { getWorkspace } from "@/lib/workspace";
import { getPeople } from "@/lib/queries";
import { Card, CardHeader, Field, Input, PageHeader, Select } from "@/components/ui";
import { Modal, SubmitButton } from "@/components/client-ui";
import { createPerson, deletePerson, updatePerson } from "../actions/people";
import { upcomingQuarters, fiscalQuarterOf } from "@/lib/fiscal";
import { cn } from "@/lib/utils";
import type { Allocation } from "@/lib/types";

export const metadata: Metadata = { title: "Capacity" };

function cellClass(pct: number) {
  if (pct === 0) return "bg-navy-50 text-navy-300";
  if (pct > 100) return "bg-red-500 text-white";
  if (pct > 85) return "bg-amber-400 text-navy-950";
  if (pct > 50) return "bg-emerald-500 text-white";
  return "bg-emerald-100 text-emerald-800";
}

const TYPE_LABEL = { fte: "Employee", contractor: "Contractor", backfill: "Backfill / vacancy", pool: "Pool" } as const;

export default async function CapacityPage() {
  const ws = await getWorkspace();
  if (!ws.features.has("resources") || !ws.blueprint.modules.resources) redirect("/app/billing?feature=resources");
  const bp = ws.blueprint;
  const [people, { data }] = await Promise.all([getPeople(ws), ws.supabase.from("allocations").select("*").eq("organization_id", ws.org.id)]);
  const allocs = (data ?? []) as Allocation[];
  const now = fiscalQuarterOf(new Date(), bp.company.fiscalYearStartMonth);
  const quarters = upcomingQuarters(new Date(), bp.company.fiscalYearStartMonth, 2).filter((q) => q.end >= now.start);
  const active = people.filter((p) => p.active);

  const hours = (personId: string, q: string) => allocs.filter((a) => a.person_id === personId && a.quarter === q).reduce((s, a) => s + Number(a.hours), 0);
  const unassigned = (q: string) => allocs.filter((a) => !a.person_id && a.quarter === q).reduce((s, a) => s + Number(a.hours), 0);
  const discDemand = (d: string, q: string) => allocs.filter((a) => a.discipline === d && a.quarter === q).reduce((s, a) => s + Number(a.hours), 0);
  const discSupply = (d: string) => active.filter((p) => p.discipline === d).reduce((s, p) => s + Number(p.capacity_hours_per_quarter), 0);

  return (
    <>
      <PageHeader
        title="Capacity"
        subtitle={`Committed hours against each person's quarterly capacity (${bp.capacityPerQuarter} h default).`}
        actions={
          ws.canWrite ? (
            <Modal title="Add person" trigger={<><UserPlus className="h-4 w-4" /> Add person</>}>
              <form action={createPerson} className="space-y-4">
                <Field label="Name"><Input name="name" required autoFocus /></Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Discipline"><Select name="discipline">{bp.disciplines.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}</Select></Field>
                  <Field label="Type"><Select name="employment_type">{Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
                  <Field label="Hours per quarter"><Input name="capacity" type="number" defaultValue={bp.capacityPerQuarter} /></Field>
                  <Field label="Email (optional)"><Input name="email" type="email" /></Field>
                </div>
                <div className="flex justify-end"><SubmitButton>Add</SubmitButton></div>
              </form>
            </Modal>
          ) : null
        }
      />

      <Card className="mb-6 overflow-x-auto">
        <CardHeader title="People × quarter" subtitle="Green is healthy, amber above 85%, red over-allocated." />
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="text-xs text-[var(--muted)]">
              <th className="px-5 py-2 text-left font-medium">Person</th>
              {quarters.map((q) => (
                <th key={q.key} className={cn("px-2 py-2 text-center font-medium", q.key === now.key && "text-brand-700")}>{q.short}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {active.map((p) => (
              <tr key={p.id} className="border-t border-[var(--border)]">
                <td className="px-5 py-2">
                  <p className="font-medium text-navy-900">{p.name}</p>
                  <p className="text-xs text-[var(--muted)]">{bp.disciplines.find((d) => d.key === p.discipline)?.label ?? "—"} · {p.capacity_hours_per_quarter} h</p>
                </td>
                {quarters.map((q) => {
                  const h = hours(p.id, q.key);
                  const pct = p.capacity_hours_per_quarter ? (h / p.capacity_hours_per_quarter) * 100 : 0;
                  return (
                    <td key={q.key} className="px-1 py-1">
                      <div className={cn("rounded-md px-2 py-2 text-center text-xs font-semibold tabular-nums", cellClass(pct))} title={`${h} h of ${p.capacity_hours_per_quarter} h`}>
                        {h ? `${Math.round(pct)}%` : "—"}
                        {h ? <span className="block text-[10px] font-normal opacity-80">{h} h</span> : null}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="border-t border-[var(--border)] bg-navy-50/40">
              <td className="px-5 py-2 text-xs font-medium text-[var(--muted)]">Not yet assigned to a person</td>
              {quarters.map((q) => <td key={q.key} className="px-2 py-2 text-center text-xs tabular-nums text-navy-700">{unassigned(q.key) || "—"}</td>)}
            </tr>
          </tbody>
        </table>
        {!active.length ? <p className="px-5 pb-5 text-sm text-[var(--muted)]">Add the people you plan with to see their load.</p> : null}
      </Card>

      <Card className="mb-6 overflow-x-auto">
        <CardHeader title="Demand vs supply by discipline" subtitle="Committed hours ÷ total capacity of that discipline." />
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="text-xs text-[var(--muted)]">
              <th className="px-5 py-2 text-left font-medium">Discipline</th>
              {quarters.map((q) => <th key={q.key} className="px-2 py-2 text-center font-medium">{q.short}</th>)}
            </tr>
          </thead>
          <tbody>
            {bp.disciplines.map((d) => {
              const supply = discSupply(d.key);
              return (
                <tr key={d.key} className="border-t border-[var(--border)]">
                  <td className="px-5 py-2"><p className="font-medium text-navy-900">{d.label}</p><p className="text-xs text-[var(--muted)]">{supply} h/quarter</p></td>
                  {quarters.map((q) => {
                    const dem = discDemand(d.key, q.key);
                    const pct = supply ? (dem / supply) * 100 : dem ? 999 : 0;
                    return (
                      <td key={q.key} className="px-1 py-1">
                        <div className={cn("rounded-md px-2 py-2 text-center text-xs font-semibold tabular-nums", cellClass(pct))}>
                          {dem ? (supply ? `${Math.round(pct)}%` : "No one") : "—"}
                          {dem ? <span className="block text-[10px] font-normal opacity-80">{dem} h</span> : null}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <Card>
        <CardHeader title="People" subtitle={`${active.length} active`} />
        <ul className="divide-y divide-[var(--border)]">
          {people.map((p) => (
            <li key={p.id} className="px-5 py-3">
              <form action={updatePerson} className="grid items-center gap-2 sm:grid-cols-[1.4fr_1.2fr_1fr_110px_auto_auto]">
                <input type="hidden" name="id" value={p.id} />
                <Input name="name" defaultValue={p.name} disabled={!ws.canWrite} aria-label="Name" />
                <Select name="discipline" defaultValue={p.discipline ?? ""} disabled={!ws.canWrite} aria-label="Discipline">
                  <option value="">—</option>
                  {bp.disciplines.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
                </Select>
                <Select name="employment_type" defaultValue={p.employment_type} disabled={!ws.canWrite} aria-label="Type">
                  {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </Select>
                <Input name="capacity" type="number" defaultValue={p.capacity_hours_per_quarter} disabled={!ws.canWrite} aria-label="Hours per quarter" />
                <label className="flex items-center gap-1.5 text-xs text-navy-700"><input type="checkbox" name="active" defaultChecked={p.active} disabled={!ws.canWrite} className="accent-brand-500" /> Active</label>
                {ws.canWrite ? (
                  <span className="flex gap-1">
                    <SubmitButton size="sm" variant="secondary">Save</SubmitButton>
                    <button formAction={deletePerson} className="rounded-md p-2 text-navy-300 hover:text-red-600" aria-label={`Delete ${p.name}`}><Trash2 className="h-4 w-4" /></button>
                  </span>
                ) : null}
              </form>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
