import type { Metadata } from "next";
import { Check } from "lucide-react";
import { PageHero } from "@/components/marketing/page-hero";
import { Section } from "@/components/marketing/chrome";
import { ButtonLink } from "@/components/ui";

export const metadata: Metadata = {
  title: "Solutions",
  description: "GorillaPM for engineering and critical facilities, construction and MEP, software teams, agencies and small teams.",
};

const SOLUTIONS = [
  {
    id: "engineering",
    eyebrow: "Engineering & critical facilities",
    title: "Portfolio governance for teams that keep critical sites running.",
    body: "Maintenance and repair projects, end-of-life replacements and capital upgrades all compete for the same engineers and the same shutdown windows. GorillaPM puts them in one backlog, scores them on safety, availability, compliance and energy, and checks capacity per discipline before anything is committed.",
    points: [
      "Weighted scoring: Safety ×2.5 + Availability ×5 + Compliance ×2 + Energy ×0.5, or your own",
      "Fiscal quarters as program increments (for example Q1 = July–September)",
      "Disciplines with default hours per project-day: PM, electrical, mechanical, technicians, contractors",
      "Four-phase project template with SOW, quote, PO, permits, works and close-out tasks",
      "Monthly governance and biweekly review meetings, scheduled for the year",
    ],
  },
  {
    id: "construction",
    eyebrow: "Construction & MEP",
    title: "Phases, dates and contractors in one timeline.",
    body: "Design, procurement, construction, commissioning and handover as phases, with every task on a week-by-week timeline and a charter that tracks budget against the baseline.",
    points: ["Waterfall phase template", "Timeline view with today marker", "Project charter with budget baseline vs forecast", "RAID log for risks and decisions", "Guests for clients and contractors (read-only)"],
  },
  {
    id: "software",
    eyebrow: "Software & product",
    title: "Backlog, sprints and a board that moves.",
    body: "Products, epics and stories with story points and two-week sprints. Sprint planning and retros go in the meeting cadence automatically.",
    points: ["Scrum preset with stories and epics", "Story points or hours", "Cost-of-delay scoring for the backlog", "Kanban board with drag and drop", "Planning and retro meeting series"],
  },
  {
    id: "services",
    eyebrow: "Agencies & professional services",
    title: "Clients, projects and hours without the admin.",
    body: "Clients as programs, projects underneath, a Kanban board per project and a timer on every task.",
    points: ["Kanban preset", "Clients as a top level", "Timer and hours per project", "Capacity per person", "Guest access for clients"],
  },
  {
    id: "teams",
    eyebrow: "Small teams",
    title: "Lists, due dates and focus.",
    body: "No ceremony: My Work, lists, a board and the Eisenhower matrix. Upgrade when the team grows.",
    points: ["Task tracker preset", "My Work view", "Eisenhower matrix", "Excel and Planner import"],
  },
];

export default function SolutionsPage() {
  return (
    <>
      <PageHero eyebrow="Solutions" title="One platform, set up for how your industry works." body="Pick your industry in the setup wizard and GorillaPM starts from the right template. Adjust anything afterwards." />
      {SOLUTIONS.map((s, i) => (
        <Section key={s.id} id={s.id} className={i % 2 ? "bg-[var(--bg)]" : ""}>
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-brand-500">{s.eyebrow}</p>
              <h2 className="mt-2 text-3xl font-semibold text-navy-950">{s.title}</h2>
              <p className="mt-4 text-lg leading-relaxed text-[var(--muted)]">{s.body}</p>
            </div>
            <ul className="space-y-3 self-center rounded-2xl border border-[var(--border)] bg-white p-6">
              {s.points.map((p) => (
                <li key={p} className="flex gap-3 text-navy-800">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-brand-500" aria-hidden />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </Section>
      ))}
      <Section>
        <div className="text-center">
          <ButtonLink href="/signup" size="lg">Start free trial</ButtonLink>
        </div>
      </Section>
    </>
  );
}
