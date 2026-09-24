import type { Metadata } from "next";
import { Check, Lock } from "lucide-react";
import { getWorkspace, trialDaysLeft } from "@/lib/workspace";
import { isStripeConfigured } from "@/lib/env";
import { PLANS, FEATURE_PLAN } from "@/lib/plans";
import { Card, PageHeader, Badge } from "@/components/ui";
import { SubmitButton } from "@/components/client-ui";
import { startCheckout, openPortal } from "./actions";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Billing" };

export default async function BillingPage({ searchParams }: PageProps<"/app/billing">) {
  const sp = await searchParams;
  const ws = await getWorkspace({ allowIncomplete: true });
  const days = trialDaysLeft(ws.org);
  const configured = isStripeConfigured();
  const feature = typeof sp.feature === "string" ? sp.feature : null;
  const needed = feature ? FEATURE_PLAN[feature] : null;
  const subscribed = ws.org.plan !== "trial" && ["active", "trialing", "past_due"].includes(ws.org.subscription_status);

  return (
    <>
      <PageHeader title="Billing" subtitle="One price per company. Change or cancel any time." />

      {sp.success ? <p className="mb-6 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Thank you! Your plan is being activated; it can take a few seconds to show here.</p> : null}
      {feature && needed ? (
        <p className="mb-6 flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-3 text-sm text-white">
          <Lock className="h-4 w-4" /> That part of GorillaPM is included from the <strong className="capitalize">{needed}</strong> plan, or isn&apos;t switched on in your workspace setup.
        </p>
      ) : null}
      {!configured ? (
        <p className="mb-6 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">Online payments aren&apos;t switched on yet. Contact info@gorillamec.com to change plans.</p>
      ) : null}

      <Card className="mb-8 flex flex-wrap items-center gap-4 p-5">
        <div className="flex-1">
          <p className="text-sm text-[var(--muted)]">Current plan</p>
          <p className="font-display text-2xl font-semibold capitalize text-navy-950">
            {ws.org.plan === "trial" ? "Premium trial" : ws.org.plan} <Badge tone={ws.active ? "green" : "red"} className="ml-2 align-middle">{ws.org.subscription_status.replace("_", " ")}</Badge>
          </p>
          <p className="text-sm text-[var(--muted)]">
            {days !== null ? `${days} day${days === 1 ? "" : "s"} left in your trial.` : ws.org.current_period_end ? `Renews or ends ${formatDate(ws.org.current_period_end)}.` : ""}
          </p>
        </div>
        {ws.org.stripe_customer_id && configured ? (
          <form action={openPortal}>
            <SubmitButton variant="secondary">Invoices, payment method, cancel</SubmitButton>
          </form>
        ) : null}
      </Card>

      {["monthly", "annual"].map((period) => (
        <section key={period} className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">{period === "monthly" ? "Monthly" : "Annual — two months free"}</h2>
          <div className="grid gap-5 lg:grid-cols-3">
            {PLANS.map((p) => {
              const current = ws.org.plan === p.key;
              const price = period === "annual" ? p.monthly * 10 : p.monthly;
              return (
                <Card key={p.key} className={cn("flex flex-col p-6", p.key === needed && "ring-2 ring-brand-500")}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-navy-950">{p.name}</h3>
                    {current ? <Badge tone="green">Current</Badge> : p.highlight ? <Badge tone="brand">Most popular</Badge> : null}
                  </div>
                  <p className="mt-3">
                    <span className="font-display text-3xl font-semibold text-navy-950">€{price.toLocaleString("en-GB")}</span>
                    <span className="text-sm text-[var(--muted)]"> /{period === "annual" ? "year" : "month"} excl. VAT</span>
                  </p>
                  <p className="mt-1 text-sm text-[var(--muted)]">{p.users}</p>
                  <ul className="mt-4 flex-1 space-y-2 text-sm text-navy-800">
                    {p.bullets.map((b) => (
                      <li key={b} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />{b}</li>
                    ))}
                  </ul>
                  {ws.isAdmin && configured ? (
                    <form action={startCheckout} className="mt-5">
                      <input type="hidden" name="plan" value={p.key} />
                      <input type="hidden" name="period" value={period} />
                      <SubmitButton className="w-full" variant={p.highlight ? "primary" : "dark"} disabled={current && subscribed} pendingText="Opening checkout…">
                        {current && subscribed ? "Your plan" : subscribed ? `Switch to ${p.name}` : `Choose ${p.name}`}
                      </SubmitButton>
                    </form>
                  ) : null}
                </Card>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}
