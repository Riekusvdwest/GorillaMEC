import Link from "next/link";
import {
  ArrowRight,
  Inbox,
  Scale,
  Users,
  Rocket,
  RefreshCcw,
  Gauge,
  CalendarClock,
  LayoutGrid,
  MailCheck,
  GanttChart,
  ShieldCheck,
  HardHat,
  FileCheck2,
  ClipboardList,
  Wrench,
  Check,
} from "lucide-react";
import { ButtonLink } from "@/components/ui";
import { Section, SectionTitle } from "@/components/marketing/chrome";
import { ProductMockup } from "@/components/marketing/product-mockup";
import { MethodologyPicker } from "@/components/marketing/methodology-picker";
import { PLANS } from "@/lib/plans";

const LOOP = [
  { icon: Inbox, title: "Identify", body: "Anyone raises a request through a shareable intake form. It lands in one backlog with an ID, source and impact." },
  { icon: Scale, title: "Prioritise", body: "Score each request on your own criteria and weights. The backlog ranks itself, and you commit Must, Should or Could per quarter." },
  { icon: Users, title: "Allocate", body: "Name a lead per discipline and estimate hours. See straight away who goes over capacity before you commit." },
  { icon: Rocket, title: "Deliver", body: "Committed work becomes a project with phases, tasks, a board and a timeline. Progress rolls up to the portfolio." },
  { icon: RefreshCcw, title: "Review", body: "Did the KPI move? New issue found? One click feeds it back into the backlog, and the loop closes." },
];

const FEATURES = [
  { icon: Scale, title: "Weighted prioritisation", body: "Safety, availability, compliance, cost — whatever matters to you, weighted to 100%. No more loudest-voice-wins." },
  { icon: Gauge, title: "Capacity by discipline", body: "Quarterly hours per person against committed work. Red means over-allocated, before it becomes a missed date." },
  { icon: GanttChart, title: "Gantt and sprints side by side", body: "Waterfall for the capital project, Kanban for maintenance, sprints for the software team. One workspace." },
  { icon: CalendarClock, title: "Governance that runs itself", body: "Monthly governance and biweekly reviews scheduled for the year, each with an agenda built from the backlog." },
  { icon: LayoutGrid, title: "My Work and the Eisenhower matrix", body: "Every person sees overdue, today and this week, sorted by what is urgent and what is important, with a timer." },
  { icon: MailCheck, title: "Stakeholder updates in one click", body: "Dated notes on each item become a clean weekly update email. Edit, copy, send." },
];

const ENGINEERING = [
  { icon: ClipboardList, text: "Project charters with budget baseline vs forecast" },
  { icon: HardHat, text: "Hours by discipline: PM, electrical, mechanical, technicians, contractors" },
  { icon: FileCheck2, text: "Four-phase template: initiation, contracting, implementation, close-out" },
  { icon: Wrench, text: "Scope → SOW → quote → PO → works → handover, as tasks you can track" },
  { icon: ShieldCheck, text: "RAID log for risks, assumptions, issues and decisions" },
  { icon: CalendarClock, text: "Fiscal-year quarters that match how your budget works" },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="blueprint relative overflow-hidden text-white">
        <div className="mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
          <div className="mx-auto max-w-4xl text-center">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-navy-200">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
              By GorillaMEC · built by engineers who deliver projects in live data centres
            </p>
            <h1 className="mt-6 text-4xl font-semibold leading-[1.05] sm:text-6xl">
              Project management that works <span className="text-brand-500">the way your team does.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-navy-200">
              Waterfall, Agile, Kanban, or all three. Answer nine questions and GorillaPM builds your workspace: intake, prioritisation,
              capacity, sprints and close-out in one place.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <ButtonLink href="/signup" size="lg" className="glow">
                Start your 14-day free trial <ArrowRight className="h-4 w-4" />
              </ButtonLink>
              <ButtonLink href="/contact" size="lg" variant="outlineLight">
                Book a demo
              </ButtonLink>
            </div>
            <p className="mt-4 text-xs text-navy-300">No card needed · Premium features during the trial · Cancel any time</p>
          </div>
          <div className="mt-16">
            <ProductMockup />
          </div>
        </div>
      </section>

      {/* The loop */}
      <Section>
        <SectionTitle
          eyebrow="The closed loop"
          title="Most tools start at the task. GorillaPM starts where work starts: the request."
          body="Five stages, one system. Every request is scored, resourced, delivered and reviewed, and what you learn feeds the next cycle."
        />
        <ol className="mt-14 grid gap-4 md:grid-cols-5">
          {LOOP.map((s, i) => (
            <li key={s.title} className="relative rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <s.icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="font-display text-sm font-semibold text-navy-200">0{i + 1}</span>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-navy-950">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{s.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* Methodology picker */}
      <Section className="bg-[var(--bg)]">
        <SectionTitle
          eyebrow="Your way of working"
          title="Pick a method. Your workspace follows."
          body="The setup wizard asks how you work, which views you like, how you prioritise and how your team is built. Then it generates the workspace to match."
        />
        <MethodologyPicker />
      </Section>

      {/* Features */}
      <Section>
        <SectionTitle eyebrow="What's inside" title="Everything a PMO needs, nothing it has to build in Excel." center />
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-[var(--border)] p-6 transition-shadow hover:shadow-md">
              <f.icon className="h-6 w-6 text-brand-600" aria-hidden />
              <h3 className="mt-4 text-lg font-semibold text-navy-950">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{f.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link href="/features" className="inline-flex items-center gap-1 font-medium text-brand-700 hover:text-brand-800">
            See all features <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </Section>

      {/* Engineering */}
      <section className="blueprint text-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 sm:py-24 lg:grid-cols-2">
          <div>
            <SectionTitle
              dark
              eyebrow="Built for engineering teams"
              title="Born in a data-centre engineering portfolio, not a software sprint."
              body="GorillaPM grew out of running mechanical and electrical projects with a tracker, a sprint plan and a master programme in three spreadsheets. It does what those did, in one place, for any team that delivers physical work."
            />
            <ButtonLink href="/solutions#engineering" variant="outlineLight" className="mt-8">
              Engineering & critical facilities <ArrowRight className="h-4 w-4" />
            </ButtonLink>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {ENGINEERING.map((e) => (
              <li key={e.text} className="flex gap-3 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-navy-100">
                <e.icon className="h-5 w-5 shrink-0 text-brand-400" aria-hidden />
                {e.text}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Pricing teaser */}
      <Section className="bg-[var(--bg)]">
        <SectionTitle eyebrow="Pricing" title="One price per company. Not per seat." body="Each plan includes a generous number of users, so adding a colleague never needs a purchase order." center />
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {PLANS.map((p) => (
            <div key={p.key} className={`rounded-2xl border bg-white p-7 ${p.highlight ? "border-brand-500 shadow-lg ring-1 ring-brand-500" : "border-[var(--border)]"}`}>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-navy-950">{p.name}</h3>
                {p.highlight ? <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-800">Most popular</span> : null}
              </div>
              <p className="mt-4">
                <span className="font-display text-4xl font-semibold text-navy-950">€{p.monthly.toLocaleString("en-GB")}</span>
                <span className="text-sm text-[var(--muted)]"> /month</span>
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">{p.users}</p>
              <ul className="mt-6 space-y-2.5 text-sm text-navy-800">
                {p.bullets.slice(0, 4).map((b) => (
                  <li key={b} className="flex gap-2">
                    <Check className="h-4 w-4 shrink-0 text-brand-600" aria-hidden /> {b}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <ButtonLink href="/pricing" variant="dark">
            Compare plans <ArrowRight className="h-4 w-4" />
          </ButtonLink>
        </div>
      </Section>

      {/* Final CTA */}
      <Section>
        <div className="relative overflow-hidden rounded-3xl bg-brand-500 px-6 py-14 text-center text-navy-950 sm:px-12">
          <div className="blueprint-light absolute inset-0 opacity-40" aria-hidden />
          <div className="relative">
            <h2 className="text-3xl font-semibold sm:text-4xl">Your spreadsheets did their job. Give them a promotion.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-navy-950/80">Import your Excel tracker or MS Planner export on day one and keep every task, date and status.</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <ButtonLink href="/signup" size="lg" variant="dark">
                Start free trial
              </ButtonLink>
              <ButtonLink href="/contact" size="lg" variant="outlineDark">
                Talk to us
              </ButtonLink>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
