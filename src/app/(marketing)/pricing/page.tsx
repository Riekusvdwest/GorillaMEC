import type { Metadata } from "next";
import { Check, Minus } from "lucide-react";
import { Section, SectionTitle } from "@/components/marketing/chrome";
import { PricingCards } from "@/components/marketing/pricing-cards";
import { COMPARISON, type Cell } from "@/lib/plans";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Basic €39, Premium €300 and Gold €1,500 per month, per company. 14-day free trial with Premium features, no card needed.",
};

const FAQ = [
  { q: "Is the price per user?", a: "No. You pay one price per company and each plan includes a set number of users: 5 on Basic, 30 on Premium and 100 on Gold. Gold adds seats at €15 per user per month beyond 100." },
  { q: "What happens after the 14-day trial?", a: "Your workspace becomes read-only until you choose a plan. Nothing is deleted, and you can export your data at any time." },
  { q: "Can I change plans later?", a: "Yes. Upgrades apply immediately and are prorated. Downgrades take effect at the end of your billing period." },
  { q: "Can I import my existing Excel or MS Planner trackers?", a: "Yes, on every plan. Upload the file, match its columns to GorillaPM fields, preview and import." },
  { q: "Where is my data stored?", a: "In a managed Postgres database with row-level security, so every company's data is kept separate. Contact us for data-residency details." },
  { q: "Do you charge VAT?", a: "Prices exclude VAT. EU businesses with a valid VAT number are invoiced under the reverse-charge rule." },
];

function CellValue({ v }: { v: Cell }) {
  if (v === true) return <Check className="mx-auto h-5 w-5 text-brand-500" aria-label="Included" />;
  if (v === false) return <Minus className="mx-auto h-5 w-5 text-navy-200" aria-label="Not included" />;
  return <span className="text-sm text-navy-800">{v}</span>;
}

export default function PricingPage() {
  return (
    <>
      <section className="blueprint text-white">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-20">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-500">Pricing</p>
          <h1 className="mt-3 text-4xl font-semibold sm:text-5xl">One price per company. Everyone included.</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-navy-200">Start with a 14-day trial of Premium, no card needed. Pick a plan when you are ready.</p>
        </div>
      </section>
      <Section className="bg-[var(--bg)] !pt-0">
        <div className="-mt-10">
          <PricingCards />
        </div>
      </Section>
      <Section>
        <SectionTitle title="Compare every feature" center />
        <div className="mt-10 overflow-x-auto rounded-2xl border border-[var(--border)]">
          <table className="w-full min-w-[640px] text-left">
            <thead className="bg-white">
              <tr className="border-b border-[var(--border)]">
                <th className="w-2/5 px-5 py-4 text-sm font-medium text-[var(--muted)]">Feature</th>
                {["Basic", "Premium", "Gold"].map((p) => (
                  <th key={p} className="px-5 py-4 text-center font-display text-base font-semibold text-navy-950">{p}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((g) => (
                <GroupRows key={g.group} group={g} />
              ))}
            </tbody>
          </table>
        </div>
      </Section>
      <Section className="bg-[var(--bg)]">
        <SectionTitle title="Questions" center />
        <div className="mx-auto mt-10 max-w-3xl divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)] bg-white">
          {FAQ.map((f) => (
            <details key={f.q} className="group px-6 py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between font-medium text-navy-950 [&::-webkit-details-marker]:hidden">
                {f.q}
                <span className="ml-4 text-brand-500 transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">{f.a}</p>
            </details>
          ))}
        </div>
      </Section>
    </>
  );
}

function GroupRows({ group }: { group: (typeof COMPARISON)[number] }) {
  return (
    <>
      <tr className="bg-navy-50/60">
        <td colSpan={4} className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-navy-600">
          {group.group}
        </td>
      </tr>
      {group.rows.map((r) => (
        <tr key={r.label} className="border-b border-[var(--border)] last:border-0">
          <td className="px-5 py-3.5 text-sm text-navy-900">{r.label}</td>
          <td className="px-5 py-3.5 text-center"><CellValue v={r.basic} /></td>
          <td className="px-5 py-3.5 text-center"><CellValue v={r.premium} /></td>
          <td className="px-5 py-3.5 text-center"><CellValue v={r.gold} /></td>
        </tr>
      ))}
    </>
  );
}
