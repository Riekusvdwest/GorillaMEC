import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms of service" };

export default function TermsPage() {
  return (
    <>
      <h1>Terms of service</h1>
      <p className="text-sm text-[var(--muted)]">Last updated: 24 September 2026</p>
      <p>
        These terms apply to GorillaPM, a service provided by GorillaMEC in the Netherlands. By creating an account you agree to them on behalf of yourself and the
        company you create or join.
      </p>
      <h2>Your account</h2>
      <ul>
        <li>You must give accurate details and keep your sign-in secure.</li>
        <li>The person who creates a company workspace is its owner and controls who has access.</li>
        <li>You are responsible for the content your company adds and for having the right to add it.</li>
      </ul>
      <h2>Trial, plans and payment</h2>
      <ul>
        <li>New companies get a 14-day trial. After the trial, the workspace is read-only until a plan is chosen.</li>
        <li>Plans are billed monthly or yearly in advance through Stripe. Prices exclude VAT.</li>
        <li>Upgrades apply immediately and are prorated. Downgrades and cancellations take effect at the end of the current billing period.</li>
        <li>If a payment fails and is not resolved within 14 days, the workspace may become read-only.</li>
      </ul>
      <h2>Your data</h2>
      <p>
        Your company owns its workspace content. We process it only to provide the service, as described in our privacy policy. You can export your data while your
        account is active.
      </p>
      <h2>Acceptable use</h2>
      <p>Don&apos;t use GorillaPM to break the law, attack the service, or access data that isn&apos;t yours. We may suspend accounts that do.</p>
      <h2>Availability and liability</h2>
      <p>
        We work to keep the service available and your data safe, but we provide it &ldquo;as is&rdquo; except where Gold-plan service levels are agreed in writing.
        Our total liability is limited to the fees you paid in the 12 months before the claim, unless the law does not allow this limit.
      </p>
      <h2>Changes and law</h2>
      <p>We may update these terms and will tell account owners about material changes. Dutch law applies.</p>
      <p>
        Contact: <a className="text-brand-600" href="mailto:info@gorillamec.com">info@gorillamec.com</a>
      </p>
    </>
  );
}
