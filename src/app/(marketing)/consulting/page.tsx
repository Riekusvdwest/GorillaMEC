import type { Metadata } from "next";
import { Fan, Zap, Network, ArrowRight } from "lucide-react";
import { PageHero } from "@/components/marketing/page-hero";
import { Section } from "@/components/marketing/chrome";
import { ButtonLink } from "@/components/ui";

export const metadata: Metadata = {
  title: "MEP consulting",
  description: "GorillaMEC: mechanical and electrical design, CAD drawings and infrastructure coordination for data centres and industrial spaces.",
};

const SERVICES = [
  { icon: Fan, title: "Mechanical design", body: "Detailed HVAC layouts and infrastructure coordination that keep operations running smoothly." },
  { icon: Zap, title: "Electrical layouts", body: "Accurate electrical and mechanical CAD drawings, crafted for compliance and constructability." },
  { icon: Network, title: "HVAC and infrastructure coordination", body: "Coordination between disciplines, contractors and operations, so drawings are practical and ready for construction and installation." },
];

export default function ConsultingPage() {
  return (
    <>
      <PageHero
        eyebrow="GorillaMEC consulting"
        title="Mechanical and electrical consulting solutions that work."
        body="Precision CAD designs and engineering solutions for data centres and industrial spaces, tailored to your requirements."
      >
        <ButtonLink href="/contact?topic=consulting" size="lg">
          Discuss your project <ArrowRight className="h-4 w-4" />
        </ButtonLink>
      </PageHero>
      <Section>
        <div className="grid gap-6 md:grid-cols-3">
          {SERVICES.map((s) => (
            <div key={s.title} className="rounded-2xl border border-[var(--border)] p-7">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <s.icon className="h-6 w-6" aria-hidden />
              </span>
              <h2 className="mt-5 text-xl font-semibold text-navy-950">{s.title}</h2>
              <p className="mt-2 leading-relaxed text-[var(--muted)]">{s.body}</p>
            </div>
          ))}
        </div>
      </Section>
      <Section className="bg-[var(--bg)]">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-semibold text-navy-950">Engineering you can build from.</h2>
            <p className="mt-4 text-lg leading-relaxed text-[var(--muted)]">
              We craft detailed mechanical and electrical designs for data centres and industrial spaces. Every drawing is practical, compliant and ready for smooth
              construction and installation.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ["Precision design", "Drawings coordinated across disciplines before they reach site."],
              ["Reliable delivery", "Clear scope, clear dates, and a project plan you can follow in GorillaPM."],
            ].map(([t, b]) => (
              <div key={t} className="rounded-2xl border border-[var(--border)] bg-white p-6">
                <h3 className="font-semibold text-navy-950">{t}</h3>
                <p className="mt-2 text-sm text-[var(--muted)]">{b}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>
    </>
  );
}
