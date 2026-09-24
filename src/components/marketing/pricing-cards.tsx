"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { ButtonLink } from "@/components/ui";
import { PLANS } from "@/lib/plans";
import { cn } from "@/lib/utils";

export function PricingCards() {
  const [annual, setAnnual] = useState(false);
  return (
    <div>
      <div className="flex justify-center">
        <div className="inline-flex rounded-full border border-[var(--border)] bg-white p-1 text-sm" role="radiogroup" aria-label="Billing period">
          {[
            { v: false, l: "Monthly" },
            { v: true, l: "Annual · 2 months free" },
          ].map((o) => (
            <button
              key={o.l}
              role="radio"
              aria-checked={annual === o.v}
              onClick={() => setAnnual(o.v)}
              className={cn("rounded-full px-4 py-1.5 font-medium transition-colors", annual === o.v ? "bg-navy-900 text-white" : "text-navy-700 hover:text-navy-950")}
            >
              {o.l}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        {PLANS.map((p) => {
          const price = annual ? p.annualPerMonth : p.monthly;
          return (
            <div
              key={p.key}
              className={cn(
                "flex flex-col rounded-2xl border bg-white p-7",
                p.highlight ? "border-brand-500 shadow-xl ring-1 ring-brand-500" : "border-[var(--border)] shadow-sm",
              )}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-navy-950">{p.name}</h2>
                {p.highlight ? <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">Most popular</span> : null}
              </div>
              <p className="mt-2 text-sm text-[var(--muted)]">{p.tagline}</p>
              <p className="mt-6">
                <span className="font-display text-5xl font-semibold text-navy-950">€{price.toLocaleString("en-GB")}</span>
                <span className="text-sm text-[var(--muted)]"> /month</span>
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {annual ? `€${(p.monthly * 10).toLocaleString("en-GB")} billed yearly` : "billed monthly"} · excl. VAT
              </p>
              <p className="mt-4 text-sm font-medium text-navy-900">{p.users}</p>
              <ul className="mt-5 flex-1 space-y-3 text-sm text-navy-800">
                {p.bullets.map((b) => (
                  <li key={b} className="flex gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" aria-hidden />
                    {b}
                  </li>
                ))}
              </ul>
              <ButtonLink href={`/signup?plan=${p.key}${annual ? "&period=annual" : ""}`} variant={p.highlight ? "primary" : "dark"} className="mt-8 w-full">
                Start free trial
              </ButtonLink>
            </div>
          );
        })}
      </div>
    </div>
  );
}
