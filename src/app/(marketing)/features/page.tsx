import type { Metadata } from "next";
import {
  Wand2,
  Inbox,
  Scale,
  Gauge,
  GanttChart,
  Columns3,
  LayoutGrid,
  Timer,
  CalendarClock,
  ShieldAlert,
  MailCheck,
  FileSpreadsheet,
  Lock,
  Users,
  ClipboardList,
  Landmark,
} from "lucide-react";
import { PageHero } from "@/components/marketing/page-hero";
import { Section } from "@/components/marketing/chrome";
import { ButtonLink } from "@/components/ui";

export const metadata: Metadata = {
  title: "Features",
  description: "Setup wizard, intake, weighted prioritisation, capacity planning, Gantt, Kanban, sprints, governance meetings, RAID, stakeholder updates and Excel import.",
};

const GROUPS = [
  {
    title: "Set up once, shaped to you",
    items: [
      { icon: Wand2, name: "Setup wizard", body: "Nine questions about your methodology, structure, views, statuses, prioritisation, team and meetings. The answers generate your workspace, and you can re-run it any time." },
      { icon: FileSpreadsheet, name: "Excel, CSV and Planner import", body: "Upload your tracker, match columns to fields, preview and import. Tasks, backlog items, projects and people." },
      { icon: Users, name: "Roles and guests", body: "Owner, admin, manager, member and read-only guest. Invite by link; each company's data stays separate." },
    ],
    plan: "All plans",
  },
  {
    title: "Plan and deliver",
    items: [
      { icon: Columns3, name: "Kanban board", body: "Drag cards between statuses, including blocked and delayed lanes, with priority and assignee on every card." },
      { icon: GanttChart, name: "Timeline", body: "Week-by-week bars for every task with a start and finish date, grouped by phase, with today marked." },
      { icon: ClipboardList, name: "Project charters", body: "Scope, decision, cost category, site, leads, budget baseline vs forecast, dates and reference links on one page." },
      { icon: LayoutGrid, name: "My Work and Eisenhower", body: "Overdue, today and this week for each person, plus a four-quadrant matrix for urgent versus important." },
      { icon: Timer, name: "Timer", body: "Start and stop a timer on any task. Hours roll up by project and goal per week, month and quarter." },
    ],
    plan: "All plans",
  },
  {
    title: "Run the portfolio",
    items: [
      { icon: Inbox, name: "Intake form", body: "A shareable form for requests from anyone. Each submission becomes a numbered backlog item with source and impact." },
      { icon: Scale, name: "Weighted scoring", body: "Define criteria and weights that add up to 100%. Items rank themselves; committed priority and quarter follow." },
      { icon: Gauge, name: "Capacity planning", body: "Hours per person and discipline per fiscal quarter against their capacity, in a heatmap that shows red before you over-commit." },
    ],
    plan: "Premium and Gold",
  },
  {
    title: "Govern it",
    items: [
      { icon: CalendarClock, name: "Meeting cadence", body: "Recurring governance and review meetings with agendas built from new, ready, blocked and at-risk items." },
      { icon: ShieldAlert, name: "RAID log", body: "Risks scored by probability and impact, assumptions, issues, decisions and actions, per project." },
      { icon: MailCheck, name: "Stakeholder update", body: "Turns the week's dated notes into a clear update email grouped by item, ready to copy." },
    ],
    plan: "Premium and Gold",
  },
  {
    title: "Enterprise controls",
    items: [
      { icon: Landmark, name: "Finance", body: "Budgets per project with CAPEX/OPEX categories, forecast versus baseline, POs and accruals." },
      { icon: Lock, name: "SSO and audit log", body: "Single sign-on with Entra ID or SAML, an audit trail of every change, and full data export." },
    ],
    plan: "Gold · rolling out",
  },
];

export default function FeaturesPage() {
  return (
    <>
      <PageHero eyebrow="Features" title="From the first request to the final handover." body="GorillaPM covers the whole loop: identify, prioritise, allocate, deliver and review. Here is what's in the box." />
      {GROUPS.map((g, i) => (
        <Section key={g.title} className={i % 2 ? "bg-[var(--bg)]" : ""}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-3xl font-semibold text-navy-950">{g.title}</h2>
            <span className="rounded-full bg-navy-50 px-3 py-1 text-xs font-medium text-navy-700">{g.plan}</span>
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {g.items.map((f) => (
              <div key={f.name} className="rounded-2xl border border-[var(--border)] bg-white p-6">
                <f.icon className="h-6 w-6 text-brand-600" aria-hidden />
                <h3 className="mt-4 font-semibold text-navy-950">{f.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{f.body}</p>
              </div>
            ))}
          </div>
        </Section>
      ))}
      <Section>
        <div className="flex flex-col items-center gap-4 text-center">
          <h2 className="text-3xl font-semibold text-navy-950">See it with your own projects.</h2>
          <ButtonLink href="/signup" size="lg">Start free trial</ButtonLink>
        </div>
      </Section>
    </>
  );
}
