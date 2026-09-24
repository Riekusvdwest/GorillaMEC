"use server";

import { redirect } from "next/navigation";
import { adminContext } from "@/lib/action-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { isStripeConfigured, siteUrl } from "@/lib/env";
import { priceId, stripe, type Period } from "@/lib/stripe";
import type { PlanKey } from "@/lib/plans";

async function ensureCustomer(orgId: string, orgName: string, email: string, existing: string | null) {
  if (existing) return existing;
  const customer = await stripe().customers.create({ name: orgName, email, metadata: { organization_id: orgId } });
  // Billing columns are only writable by the server.
  const admin = createAdminClient();
  await admin.from("organizations").update({ stripe_customer_id: customer.id }).eq("id", orgId);
  return customer.id;
}

export async function startCheckout(fd: FormData) {
  const ws = await adminContext();
  if (!isStripeConfigured()) redirect("/app/billing?error=not-configured");
  const plan = String(fd.get("plan")) as PlanKey;
  const period = (String(fd.get("period")) === "annual" ? "annual" : "monthly") as Period;
  const price = priceId(plan, period);
  if (!price) redirect("/app/billing?error=price");

  const customer = await ensureCustomer(ws.org.id, ws.org.name, ws.user.email, ws.org.stripe_customer_id);
  if (ws.org.plan !== "trial" && ["active", "trialing", "past_due"].includes(ws.org.subscription_status)) {
    // Already subscribed: plan changes happen in the customer portal (prorated).
    const portal = await stripe().billingPortal.sessions.create({ customer, return_url: `${siteUrl()}/app/billing` });
    redirect(portal.url);
  }
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer,
    client_reference_id: ws.org.id,
    line_items: [{ price, quantity: 1 }],
    subscription_data: { metadata: { organization_id: ws.org.id } },
    allow_promotion_codes: true,
    billing_address_collection: "required",
    tax_id_collection: { enabled: true },
    customer_update: { address: "auto", name: "auto" },
    automatic_tax: { enabled: process.env.STRIPE_AUTOMATIC_TAX === "true" },
    success_url: `${siteUrl()}/app/billing?success=1`,
    cancel_url: `${siteUrl()}/app/billing?canceled=1`,
  });
  redirect(session.url!);
}

export async function openPortal() {
  const ws = await adminContext();
  if (!isStripeConfigured() || !ws.org.stripe_customer_id) redirect("/app/billing");
  const portal = await stripe().billingPortal.sessions.create({ customer: ws.org.stripe_customer_id!, return_url: `${siteUrl()}/app/billing` });
  redirect(portal.url);
}
