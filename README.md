# GorillaPM

Project and portfolio management that shapes itself to how each company works. Built by GorillaMEC.

- **Marketing site**: home, features, solutions, pricing, about, MEP consulting, contact, legal.
- **App** (`/app`): setup wizard, My work (with timer and Eisenhower matrix), projects (charter, list, board, timeline, RAID), portfolio loop (intake form → backlog → weighted scoring → allocation → monitor & control), capacity by person and discipline, governance meetings with auto-built agendas and a stakeholder-update generator, Excel/CSV/Planner import, members and invitations, billing.
- **Plans**: Basic €39, Premium €300, Gold €1,500 per month. Plan limits are enforced in the database (`plan_entitlements` + row-level security), not just the UI.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Supabase (Postgres, Auth, RLS) · Stripe Billing · Vercel.

## Setup

1. **Supabase**: open the project's SQL editor and run `supabase/migrations/20260924000001_init.sql` once.
2. **Supabase → Authentication → URL configuration**: set *Site URL* to your domain (for example `https://gorillamec.com`) and add `https://gorillamec.com/**` and `http://localhost:3000/**` to *Redirect URLs*.
3. **Vercel**: import this repository, add the variables from `.env.example`, deploy.
4. **Domain**: in Vercel → Domains add `gorillamec.com` (and `www`), then set the DNS records Vercel shows in Hostinger → Domains → DNS.
5. **Stripe** (when you want to take payments): create three products with monthly and annual prices, put the price IDs in the environment variables, and add a webhook to `https://<domain>/api/stripe/webhook` for `checkout.session.completed`, `customer.subscription.*` and `invoice.payment_failed`.

## Development

```bash
npm install
cp .env.example .env.local   # fill in Supabase URL and publishable key
npm run dev
```

Checks:

```bash
npm run typecheck
npm run lint
npm run test:db    # migrations + 33 row-level-security tests against a local Postgres
npm run build
```

## Security model

Every business table carries `organization_id` and has row-level security: users only see companies they belong to. Guests are read-only, expired trials are read-only, and Premium-only tables refuse writes on Basic. Billing columns can only be changed by the server from Stripe webhooks. See `supabase/tests/01_rls_isolation.sql`.
