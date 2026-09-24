import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { stripe, planForPrice } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

// Keeps each company's plan in sync with Stripe. Configure this URL in the
// Stripe dashboard: https://<your-domain>/api/stripe/webhook

const STATUS: Record<string, string> = {
  active: "active",
  trialing: "trialing",
  past_due: "past_due",
  canceled: "canceled",
  unpaid: "unpaid",
  incomplete: "incomplete",
  incomplete_expired: "canceled",
  paused: "canceled",
};

async function syncSubscription(sub: Stripe.Subscription) {
  const admin = createAdminClient();
  const item = sub.items.data[0];
  const plan = planForPrice(item?.price.id);
  const orgId = sub.metadata?.organization_id;
  const customer = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const periodEnd = item?.current_period_end;
  const patch: Record<string, unknown> = {
    subscription_status: STATUS[sub.status] ?? "incomplete",
    stripe_subscription_id: sub.id,
    stripe_customer_id: customer,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
  };
  if (plan && sub.status !== "canceled") patch.plan = plan;
  const q = admin.from("organizations").update(patch);
  const { error } = orgId ? await q.eq("id", orgId) : await q.eq("stripe_customer_id", customer);
  if (error) throw new Error(error.message);
}

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers.get("stripe-signature");
  if (!secret || !signature) return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await req.text(), signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        if (s.mode === "subscription" && s.subscription) {
          const sub = await stripe().subscriptions.retrieve(typeof s.subscription === "string" ? s.subscription : s.subscription.id);
          if (!sub.metadata?.organization_id && s.client_reference_id) sub.metadata = { ...sub.metadata, organization_id: s.client_reference_id };
          await syncSubscription(sub);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncSubscription(event.data.object as Stripe.Subscription);
        break;
      case "invoice.payment_failed": {
        const inv = event.data.object as Stripe.Invoice;
        const customer = typeof inv.customer === "string" ? inv.customer : inv.customer?.id;
        if (customer) await createAdminClient().from("organizations").update({ subscription_status: "past_due" }).eq("stripe_customer_id", customer);
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error("stripe webhook", event.type, e);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
