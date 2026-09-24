import type { Metadata } from "next";
import { PageHero } from "@/components/marketing/page-hero";
import { Section } from "@/components/marketing/chrome";
import { ButtonLink } from "@/components/ui";

export const metadata: Metadata = {
  title: "About",
  description: "GorillaPM is built by GorillaMEC, a mechanical and electrical engineering consultancy in the Netherlands.",
};

const PRINCIPLES = [
  { title: "Start from the request", body: "Projects don't appear from nowhere. They start as a request that competes with other requests for the same people. We put that competition in the open." },
  { title: "Capacity before commitment", body: "A plan that ignores who does the work is a wish list. Every commitment in GorillaPM is checked against hours per discipline." },
  { title: "Fit the team, not the tool", body: "Waterfall, Agile, Kanban or a mix: the setup wizard shapes the workspace to your method, and you can change your mind later." },
  { title: "Keep governance light", body: "Meetings with agendas that build themselves and updates that write themselves from the notes you already take." },
];

export default function AboutPage() {
  return (
    <>
      <PageHero eyebrow="About" title="Built by engineers who got tired of stitching spreadsheets together." />
      <Section>
        <div className="mx-auto max-w-3xl space-y-5 text-lg leading-relaxed text-navy-800">
          <p>
            GorillaMEC is a mechanical and electrical engineering consultancy based in the Netherlands. We design and coordinate MEP systems for data centres
            and industrial sites, and we manage the projects that keep those sites running.
          </p>
          <p>
            For years that meant three spreadsheets: a task tracker for the day-to-day, a sprint plan for prioritising the portfolio, and a master programme with a
            charter for every project. Each one worked. Together they took hours a week to keep in sync, and nobody else could see the whole picture.
          </p>
          <p>
            GorillaPM is those three spreadsheets turned into one product: an intake form feeding one backlog, weighted scoring, capacity per discipline,
            projects with phases and charters, governance meetings that prepare themselves, and a My Work view for every person. We use it on our own projects first.
          </p>
        </div>
      </Section>
      <Section className="bg-[var(--bg)]">
        <h2 className="text-center text-3xl font-semibold text-navy-950">What we believe</h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {PRINCIPLES.map((p) => (
            <div key={p.title} className="rounded-2xl border border-[var(--border)] bg-white p-6">
              <h3 className="font-semibold text-navy-950">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{p.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-12 flex justify-center gap-3">
          <ButtonLink href="/signup">Start free trial</ButtonLink>
          <ButtonLink href="/consulting" variant="secondary">Our engineering services</ButtonLink>
        </div>
      </Section>
    </>
  );
}
