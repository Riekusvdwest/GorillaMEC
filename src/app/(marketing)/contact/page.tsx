import type { Metadata } from "next";
import { Mail, Phone, CalendarCheck } from "lucide-react";
import { PageHero } from "@/components/marketing/page-hero";
import { Section } from "@/components/marketing/chrome";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  title: "Contact and demo",
  description: "Book a GorillaPM demo or ask GorillaMEC about MEP consulting.",
};

export default async function ContactPage({ searchParams }: PageProps<"/contact">) {
  const { topic } = await searchParams;
  return (
    <>
      <PageHero eyebrow="Contact" title="Book a demo or ask us anything." body="A 30-minute walkthrough with your own way of working: we'll run the setup wizard together." />
      <Section className="bg-[var(--bg)]">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr]">
          <div className="space-y-6">
            {[
              { icon: CalendarCheck, title: "What happens in a demo", body: "We set up a workspace for your team live, import a sample of your tracker, and show the portfolio loop end to end." },
              { icon: Mail, title: "Email", body: <a className="text-brand-700 hover:underline" href="mailto:info@gorillamec.com">info@gorillamec.com</a> },
              { icon: Phone, title: "Phone", body: <a className="text-brand-700 hover:underline" href="tel:+31657191317">+31 6 57 19 13 17</a> },
            ].map((c) => (
              <div key={c.title} className="flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-brand-700 shadow-sm ring-1 ring-[var(--border)]">
                  <c.icon className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <h2 className="font-semibold text-navy-950">{c.title}</h2>
                  <div className="mt-1 text-sm text-[var(--muted)]">{c.body}</div>
                </div>
              </div>
            ))}
          </div>
          <ContactForm topic={typeof topic === "string" ? topic : undefined} />
        </div>
      </Section>
    </>
  );
}
