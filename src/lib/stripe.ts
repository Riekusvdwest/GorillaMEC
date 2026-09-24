import "server-only";
import Stripe from "stripe";
import type { PlanKey } from "@/lib/plans";

let client: Stripe | null = null;
export function stripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  client ??= new Stripe(key);
  return client;
}

export type Period = "monthly" | "annual";

/** Price IDs come from environment variables so test and live mode can differ. */
export function priceId(plan: PlanKey, period: Period): string | undefined {
  return process.env[`STRIPE_PRICE_${plan.toUpperCase()}_${period.toUpperCase()}`];
}

export function planForPrice(price: string | null | undefined): PlanKey | null {
  if (!price) return null;
  for (const plan of ["basic", "premium", "gold"] as PlanKey[]) {
    for (const period of ["monthly", "annual"] as Period[]) {
      if (priceId(plan, period) === price) return plan;
    }
  }
  return null;
}
