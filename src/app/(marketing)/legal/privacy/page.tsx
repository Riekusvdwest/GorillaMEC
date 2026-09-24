import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return (
    <>
      <h1>Privacy policy</h1>
      <p className="text-sm text-[var(--muted)]">Last updated: 24 September 2026</p>
      <p>
        This policy explains how GorillaMEC (&ldquo;we&rdquo;), based in the Netherlands, handles personal data when you visit this website or use GorillaPM. Questions:
        <a className="text-brand-700" href="mailto:info@gorillamec.com"> info@gorillamec.com</a>.
      </p>
      <h2>What we collect</h2>
      <ul>
        <li>Account data: your name, email address and the company you create or join.</li>
        <li>Workspace content: the projects, tasks, requests, notes and files you and your colleagues add. Your company controls this content; we process it on its behalf.</li>
        <li>Contact form data: what you send us when you book a demo or ask a question.</li>
        <li>Billing data: handled by our payment provider Stripe. We never see or store full card numbers.</li>
        <li>Technical data: logs needed to keep the service secure and working, such as IP address and browser type.</li>
      </ul>
      <h2>Why we use it</h2>
      <ul>
        <li>To provide the service you signed up for (contract).</li>
        <li>To reply to your enquiries (legitimate interest or your request).</li>
        <li>To bill subscriptions and meet accounting obligations (legal obligation).</li>
        <li>To keep the service secure and fix problems (legitimate interest).</li>
      </ul>
      <p>We do not sell personal data and we do not use workspace content for advertising.</p>
      <h2>Who processes it for us</h2>
      <ul>
        <li>Supabase: database, sign-in and file storage.</li>
        <li>Vercel: website and application hosting.</li>
        <li>Stripe: payments and invoicing.</li>
      </ul>
      <p>These providers act on our instructions under data processing agreements. Where data leaves the EEA, they rely on approved transfer mechanisms.</p>
      <h2>How long we keep it</h2>
      <p>
        Workspace content is kept while your company has an account. After an account is closed we delete workspace content within 90 days, except where the law
        requires us to keep records such as invoices.
      </p>
      <h2>Your rights</h2>
      <p>
        You can ask to access, correct, export or delete your personal data, or object to how we use it, by emailing us. You can also complain to the Dutch data
        protection authority (Autoriteit Persoonsgegevens).
      </p>
      <h2>Cookies</h2>
      <p>We only use cookies that are needed to sign you in and keep your session secure. We do not use advertising cookies.</p>
    </>
  );
}
