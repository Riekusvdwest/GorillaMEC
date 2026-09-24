"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Loader2, Lock, Plus, Sparkles, Trash2, Wand2 } from "lucide-react";
import {
  METHODOLOGIES,
  PRESETS,
  presetBlueprint,
  recommendMethodology,
  plural,
  type Blueprint,
  type MeetingSeries,
  type ViewKey,
} from "@/lib/blueprint";
import { monthName } from "@/lib/fiscal";
import { describeRule, WEEKDAYS } from "@/lib/meetings";
import { Button, Field, Input, Label, Logo, Select, buttonClass } from "@/components/ui";
import { Importer } from "@/app/app/import/importer";
import { TARGETS, type ImportTarget } from "@/lib/import-map";
import { cn } from "@/lib/utils";
import { createCompany, generateWorkspace, saveDraft, type WizardExtras } from "./actions";

const STEPS = ["Company", "How you work", "Structure", "Views & rhythm", "Workflow & priorities", "Team & capacity", "Governance", "Import", "Review"];

const VIEW_OPTIONS: { key: ViewKey; label: string; hint: string }[] = [
  { key: "list", label: "List", hint: "Grouped by phase, sortable" },
  { key: "kanban", label: "Board", hint: "Drag cards between statuses" },
  { key: "timeline", label: "Timeline", hint: "Week-by-week bars" },
  { key: "eisenhower", label: "Eisenhower", hint: "Urgent vs important" },
  { key: "calendar", label: "Calendar", hint: "Due dates by month" },
];

export function Wizard({
  orgId: initialOrgId,
  initial,
  features,
  userName,
  rerun,
}: {
  orgId: string | null;
  initial: Blueprint | null;
  features: string[];
  userName: string;
  rerun: boolean;
}) {
  const [orgId, setOrgId] = useState(initialOrgId);
  const [step, setStep] = useState(initialOrgId && initial ? 1 : 0);
  const [bp, setBp] = useState<Blueprint>(initial ?? presetBlueprint("critical_facilities", ""));
  const [extras, setExtras] = useState<WizardExtras>({ people: [], invites: [], sampleData: !rerun, goToImport: false });
  const [imports, setImports] = useState<{ target: ImportTarget; created: number; file: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const has = (f: string) => features.includes(f);

  const update = (patch: Partial<Blueprint>) => setBp((b) => ({ ...b, ...patch }));

  function next() {
    setError(null);
    start(async () => {
      if (step === 0) {
        if (!bp.company.name.trim()) {
          setError("Enter your company name.");
          return;
        }
        if (!orgId) {
          const res = await createCompany(bp.company.name, bp.preset);
          if (res.error || !res.orgId) {
            setError(res.error ?? "Something went wrong.");
            return;
          }
          setOrgId(res.orgId);
          const merged = { ...bp };
          const r = await saveDraft(res.orgId, merged);
          if (r.error) setError(r.error);
        } else {
          await saveDraft(orgId, bp);
        }
      } else if (orgId) {
        const r = await saveDraft(orgId, bp);
        if (r.error) {
          setError(r.error);
          return;
        }
      }
      setStep((s) => Math.min(STEPS.length - 1, s + 1));
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function finish() {
    if (!orgId) return;
    setError(null);
    start(async () => {
      const res = await generateWorkspace(orgId, bp, extras);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="border-b border-[var(--border)] bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <div className="flex items-center gap-4 text-sm text-[var(--muted)]">
            <span className="hidden sm:inline">Step {step + 1} of {STEPS.length}</span>
            {rerun ? <Link href="/app" className="hover:text-navy-900">Cancel</Link> : null}
          </div>
        </div>
        <div className="h-1 bg-navy-50">
          <div className="h-1 bg-brand-500 transition-all" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[220px_1fr]">
        <ol className="hidden space-y-1 lg:block">
          {STEPS.map((s, i) => (
            <li key={s}>
              <button
                type="button"
                disabled={!orgId || i > step}
                onClick={() => setStep(i)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm",
                  i === step ? "bg-white font-medium text-navy-950 shadow-sm ring-1 ring-[var(--border)]" : "text-[var(--muted)]",
                  i < step && "text-navy-800 hover:bg-white",
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs",
                    i < step ? "bg-brand-500 text-navy-950" : i === step ? "bg-navy-900 text-white" : "bg-navy-100 text-navy-500",
                  )}
                >
                  {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                {s}
              </button>
            </li>
          ))}
        </ol>

        <main>
          <div className="rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm sm:p-8">
            {step === 0 && <StepCompany bp={bp} setBp={setBp} update={update} userName={userName} locked={Boolean(orgId)} />}
            {step === 1 && <StepMethod bp={bp} update={update} />}
            {step === 2 && <StepStructure bp={bp} setBp={setBp} />}
            {step === 3 && <StepViews bp={bp} update={update} setBp={setBp} has={has} />}
            {step === 4 && <StepWorkflow bp={bp} update={update} setBp={setBp} />}
            {step === 5 && <StepTeam bp={bp} update={update} extras={extras} setExtras={setExtras} has={has} />}
            {step === 6 && <StepGovernance bp={bp} update={update} setBp={setBp} has={has} />}
            {step === 7 && (
              <StepImport
                bp={bp}
                features={features}
                extras={extras}
                setExtras={setExtras}
                imports={imports}
                onImported={(r) => {
                  setImports((list) => [...list, r]);
                  setExtras((x) => ({ ...x, sampleData: false, goToImport: false }));
                }}
              />
            )}
            {step === 8 && <StepReview bp={bp} extras={extras} setExtras={setExtras} has={has} rerun={rerun} />}

            {error ? <p className="mt-6 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100" role="alert">{error}</p> : null}

            <div className="mt-8 flex items-center justify-between border-t border-[var(--border)] pt-6">
              <Button variant="ghost" type="button" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || pending}>
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              {step < STEPS.length - 1 ? (
                <Button type="button" onClick={next} disabled={pending}>
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {step === 0 && !orgId ? "Create workspace" : step === 7 && !imports.length ? "Skip for now" : "Continue"} <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button type="button" size="lg" onClick={finish} disabled={pending}>
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                  {pending ? "Building your workspace…" : rerun ? "Apply changes" : "Generate my workspace"}
                </Button>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

type SetBp = React.Dispatch<React.SetStateAction<Blueprint>>;

function StepTitle({ title, body }: { title: string; body: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold text-navy-950">{title}</h1>
      <p className="mt-1 text-[var(--muted)]">{body}</p>
    </div>
  );
}

function Toggle({ checked, onChange, label, hint, locked }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string; locked?: string }) {
  return (
    <label className={cn("flex items-start gap-3 rounded-xl border p-4", checked && !locked ? "border-brand-500 bg-brand-50/40" : "border-[var(--border)]", locked && "opacity-70")}>
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 accent-brand-500"
        checked={checked && !locked}
        disabled={Boolean(locked)}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="flex-1">
        <span className="flex items-center gap-2 font-medium text-navy-900">
          {label}
          {locked ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-navy-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
              <Lock className="h-3 w-3" /> {locked}
            </span>
          ) : null}
        </span>
        {hint ? <span className="mt-0.5 block text-sm text-[var(--muted)]">{hint}</span> : null}
      </span>
    </label>
  );
}

function StepCompany({ bp, setBp, update, userName, locked }: { bp: Blueprint; setBp: SetBp; update: (p: Partial<Blueprint>) => void; userName: string; locked: boolean }) {
  const setCompany = (patch: Partial<Blueprint["company"]>) => update({ company: { ...bp.company, ...patch } });
  return (
    <>
      <StepTitle title={`Welcome${userName ? `, ${userName.split(" ")[0]}` : ""}. Tell us about your company.`} body="Your answers build the workspace. You can change every one of them later." />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Company name" className="sm:col-span-2">
          <Input value={bp.company.name} onChange={(e) => setCompany({ name: e.target.value })} placeholder="e.g. GorillaMEC" autoFocus />
        </Field>
      </div>
      <div className="mt-6">
        <Label>Start from a template</Label>
        <div className="grid gap-3 sm:grid-cols-2">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() =>
                setBp((b) => ({ ...presetBlueprint(p.key, b.company.name), company: { ...presetBlueprint(p.key, b.company.name).company, name: b.company.name, country: b.company.country, timezone: b.company.timezone, currency: b.company.currency, teamSize: b.company.teamSize } }))
              }
              className={cn("rounded-xl border p-4 text-left transition-colors", bp.preset === p.key ? "border-brand-500 bg-brand-50/50 ring-1 ring-brand-500" : "border-[var(--border)] hover:border-navy-300")}
            >
              <span className="font-medium text-navy-950">{p.label}</span>
              <span className="mt-1 block text-sm text-[var(--muted)]">{p.description}</span>
            </button>
          ))}
        </div>
        {locked ? <p className="mt-2 text-xs text-[var(--muted)]">Switching templates resets the later steps to that template&apos;s defaults.</p> : null}
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Field label="Team size">
          <Select value={bp.company.teamSize} onChange={(e) => setCompany({ teamSize: e.target.value })}>
            {["1-5", "6-30", "31-100", "100+"].map((v) => <option key={v}>{v}</option>)}
          </Select>
        </Field>
        <Field label="Country">
          <Input value={bp.company.country} onChange={(e) => setCompany({ country: e.target.value })} />
        </Field>
        <Field label="Time zone">
          <Select value={bp.company.timezone} onChange={(e) => setCompany({ timezone: e.target.value })}>
            {["Europe/Amsterdam", "Europe/London", "Europe/Berlin", "Europe/Dublin", "Africa/Johannesburg", "America/New_York", "America/Chicago", "America/Los_Angeles", "Asia/Dubai", "Asia/Singapore", "Australia/Sydney", "UTC"].map((z) => <option key={z}>{z}</option>)}
          </Select>
        </Field>
        <Field label="Currency">
          <Select value={bp.company.currency} onChange={(e) => setCompany({ currency: e.target.value })}>
            {["EUR", "GBP", "USD", "ZAR", "AUD", "CHF", "SEK", "NOK", "DKK"].map((c) => <option key={c}>{c}</option>)}
          </Select>
        </Field>
        <Field label="Fiscal year starts in" hint="Quarters follow this month.">
          <Select value={bp.company.fiscalYearStartMonth} onChange={(e) => setCompany({ fiscalYearStartMonth: Number(e.target.value) })}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{monthName(m)}</option>)}
          </Select>
        </Field>
        <Field label="Working hours per day">
          <Input type="number" min={1} max={24} value={bp.company.hoursPerDay} onChange={(e) => setCompany({ hoursPerDay: Number(e.target.value) || 8 })} />
        </Field>
      </div>
    </>
  );
}

function StepMethod({ bp, update }: { bp: Blueprint; update: (p: Partial<Blueprint>) => void }) {
  const [quiz, setQuiz] = useState({ scope: "", cadence: "", portfolio: "", team: "", work: "" });
  const [open, setOpen] = useState(false);
  const rec = useMemo(() => (Object.values(quiz).every(Boolean) ? recommendMethodology(quiz) : null), [quiz]);
  const questions: { key: keyof typeof quiz; q: string; options: [string, string][] }[] = [
    { key: "scope", q: "How well is the scope known up front?", options: [["fixed", "Fixed and agreed"], ["mixed", "Mostly known"], ["evolving", "It changes as we learn"]] },
    { key: "cadence", q: "How often can you deliver something useful?", options: [["short", "Every week or two"], ["long", "Only at the end of a phase"]] },
    { key: "portfolio", q: "Do many requests compete for the same people?", options: [["yes", "Yes, constantly"], ["no", "Not really"]] },
    { key: "team", q: "How big is the team using this?", options: [["solo", "Just me or a few people"], ["team", "A team or department"]] },
    { key: "work", q: "What does most of your work look like?", options: [["projects", "Projects with a start and end"], ["flow", "A continuous stream of tickets"]] },
  ];
  return (
    <>
      <StepTitle title="How does your team work?" body="Pick the method closest to how you run projects today. Hybrid lets different projects use different methods." />
      <div className="grid gap-3">
        {METHODOLOGIES.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => update({ methodology: m.key })}
            className={cn("flex items-start gap-4 rounded-xl border p-4 text-left", bp.methodology === m.key ? "border-brand-500 bg-brand-50/50 ring-1 ring-brand-500" : "border-[var(--border)] hover:border-navy-300")}
          >
            <span className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border", bp.methodology === m.key ? "border-brand-500 bg-brand-500 text-navy-950" : "border-navy-300")}>
              {bp.methodology === m.key ? <Check className="h-3 w-3" /> : null}
            </span>
            <span>
              <span className="font-medium text-navy-950">{m.label}</span>
              <span className="mt-0.5 block text-sm text-navy-700">{m.blurb}</span>
              <span className="mt-1 block text-xs text-[var(--muted)]">Best for: {m.bestFor}</span>
            </span>
          </button>
        ))}
      </div>
      <div className="mt-6 rounded-xl border border-dashed border-navy-200 p-4">
        <button type="button" onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 font-medium text-brand-700">
          <Sparkles className="h-4 w-4" /> Not sure? Answer 5 quick questions
        </button>
        {open ? (
          <div className="mt-4 grid gap-4">
            {questions.map((q) => (
              <Field key={q.key} label={q.q}>
                <Select value={quiz[q.key]} onChange={(e) => setQuiz((s) => ({ ...s, [q.key]: e.target.value }))}>
                  <option value="">Choose…</option>
                  {q.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </Select>
              </Field>
            ))}
            {rec ? (
              <div className="rounded-xl bg-navy-900 p-4 text-white">
                <p className="text-sm text-navy-200">We recommend</p>
                <p className="font-display text-xl font-semibold">{METHODOLOGIES.find((m) => m.key === rec.key)?.label}</p>
                <p className="mt-1 text-sm text-navy-100">{rec.why}</p>
                <button type="button" className={buttonClass("primary", "sm", "mt-3")} onClick={() => update({ methodology: rec.key })}>
                  Use this
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </>
  );
}

function StepStructure({ bp, setBp }: { bp: Blueprint; setBp: SetBp }) {
  const lv = bp.levels;
  const setLevels = (patch: Partial<Blueprint["levels"]>) => setBp((b) => ({ ...b, levels: { ...b.levels, ...patch } }));
  return (
    <>
      <StepTitle title="How is your work structured?" body="Switch levels on or off and call them what your team calls them." />
      <div className="space-y-3">
        <LevelRow label="Program" hint="Groups related projects (or clients)." enabled={lv.program.enabled} onToggle={(v) => setLevels({ program: { ...lv.program, enabled: v } })} name={lv.program.label} onName={(v) => setLevels({ program: { ...lv.program, label: v } })} />
        <LevelRow label="Project" hint="Always on. Some teams call these goals, products or jobs." enabled name={lv.project.label} onName={(v) => setLevels({ project: { label: v } })} fixed />
        <LevelRow label="Phase" hint="Stages inside a project, such as initiation or contracting." enabled={lv.phase.enabled} onToggle={(v) => setLevels({ phase: { ...lv.phase, enabled: v } })} name={lv.phase.label} onName={(v) => setLevels({ phase: { ...lv.phase, label: v } })} />
        <LevelRow label="Task" hint="Always on. Tasks have checklists for the smallest steps." enabled name={lv.task.label} onName={(v) => setLevels({ task: { label: v } })} fixed />
      </div>
      {lv.phase.enabled ? (
        <div className="mt-6">
          <Label>Default {plural(lv.phase.label).toLowerCase()} for every new {lv.project.label.toLowerCase()}</Label>
          <ListEditor items={bp.phaseTemplate} onChange={(items) => setBp((b) => ({ ...b, phaseTemplate: items }))} placeholder="e.g. Initiation" />
        </div>
      ) : null}
    </>
  );
}

function LevelRow({ label, hint, enabled, onToggle, name, onName, fixed }: { label: string; hint: string; enabled: boolean; onToggle?: (v: boolean) => void; name: string; onName: (v: string) => void; fixed?: boolean }) {
  return (
    <div className={cn("grid items-center gap-3 rounded-xl border p-4 sm:grid-cols-[1fr_220px]", enabled ? "border-[var(--border)]" : "border-dashed border-navy-200 bg-navy-50/40")}>
      <label className="flex items-start gap-3">
        <input type="checkbox" className="mt-1 h-4 w-4 accent-brand-500" checked={enabled} disabled={fixed} onChange={(e) => onToggle?.(e.target.checked)} />
        <span>
          <span className="font-medium text-navy-950">{label}</span>
          <span className="block text-sm text-[var(--muted)]">{hint}</span>
        </span>
      </label>
      <Input value={name} disabled={!enabled} onChange={(e) => onName(e.target.value)} aria-label={`Name for ${label}`} />
    </div>
  );
}

function ListEditor({ items, onChange, placeholder }: { items: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="flex gap-2">
          <span className="flex h-10 w-8 items-center justify-center text-sm text-[var(--muted)]">{i + 1}</span>
          <Input value={it} onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))} />
          <button type="button" className={buttonClass("ghost", "md")} onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label="Remove">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button type="button" className={buttonClass("secondary", "sm")} onClick={() => onChange([...items, ""])}>
        <Plus className="h-4 w-4" /> Add {placeholder ? "" : "item"}
      </button>
    </div>
  );
}

function StepViews({ bp, update, setBp, has }: { bp: Blueprint; update: (p: Partial<Blueprint>) => void; setBp: SetBp; has: (f: string) => boolean }) {
  const toggleView = (v: ViewKey, on: boolean) =>
    setBp((b) => {
      const views = on ? Array.from(new Set([...b.views, v])) : b.views.filter((x) => x !== v);
      return { ...b, views: views.length ? views : ["list"], defaultView: views.includes(b.defaultView) ? b.defaultView : (views[0] ?? "list") };
    });
  return (
    <>
      <StepTitle title="Views and rhythm" body="Which views should every project open with, and how does your team plan its time?" />
      <div className="grid gap-3 sm:grid-cols-2">
        {VIEW_OPTIONS.map((v) => (
          <Toggle key={v.key} checked={bp.views.includes(v.key)} onChange={(on) => toggleView(v.key, on)} label={v.label} hint={v.hint} />
        ))}
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label="Default view">
          <Select value={bp.defaultView} onChange={(e) => update({ defaultView: e.target.value as ViewKey })}>
            {bp.views.map((v) => <option key={v} value={v}>{VIEW_OPTIONS.find((o) => o.key === v)?.label}</option>)}
          </Select>
        </Field>
        <Field label="Estimate work in">
          <Select value={bp.estimation} onChange={(e) => update({ estimation: e.target.value as Blueprint["estimation"] })}>
            <option value="hours">Hours</option>
            <option value="points">Story points</option>
            <option value="tshirt">T-shirt sizes (XS–XL)</option>
          </Select>
        </Field>
      </div>
      <div className="mt-6 grid gap-3">
        <Toggle
          checked={bp.sprints.enabled}
          onChange={(v) => update({ sprints: { ...bp.sprints, enabled: v } })}
          label="Plan in sprints or quarterly increments"
          hint="Commit work to a time box and review it at the end."
          locked={has("agile") ? undefined : "Premium"}
        />
        {bp.sprints.enabled && has("agile") ? (
          <Field label="Sprint length">
            <Select value={bp.sprints.cadence} onChange={(e) => update({ sprints: { ...bp.sprints, cadence: e.target.value as Blueprint["sprints"]["cadence"] } })}>
              <option value="1w">1 week</option>
              <option value="2w">2 weeks</option>
              <option value="3w">3 weeks</option>
              <option value="4w">4 weeks</option>
              <option value="quarter">A quarter (program increments)</option>
            </Select>
          </Field>
        ) : null}
        <Toggle checked={bp.timeTracking} onChange={(v) => update({ timeTracking: v })} label="Track time" hint="A start/stop timer on every task, with hours per project per week, month and quarter." />
        <Toggle checked={bp.modules.eisenhower} onChange={(v) => update({ modules: { ...bp.modules, eisenhower: v } })} label="Eisenhower buckets in My Work" hint="Sort personal work into urgent vs important." />
      </div>
    </>
  );
}

function StepWorkflow({ bp, update, setBp }: { bp: Blueprint; update: (p: Partial<Blueprint>) => void; setBp: SetBp }) {
  const total = bp.scoring.criteria.reduce((s, c) => s + (Number(c.weight) || 0), 0);
  const setCriteria = (criteria: Blueprint["scoring"]["criteria"]) => setBp((b) => ({ ...b, scoring: { ...b.scoring, criteria } }));
  return (
    <>
      <StepTitle title="Workflow and priorities" body="Which statuses do you use, and how do you decide what goes first?" />
      <Label>Task statuses</Label>
      <div className="grid gap-2 sm:grid-cols-2">
        {bp.statuses.map((s, i) => (
          <div key={s.key} className="flex items-center gap-3 rounded-lg border border-[var(--border)] px-3 py-2">
            <input
              type="checkbox"
              className="h-4 w-4 accent-brand-500"
              checked={s.enabled}
              disabled={s.key === "not_started" || s.key === "completed"}
              onChange={(e) => setBp((b) => ({ ...b, statuses: b.statuses.map((x, j) => (j === i ? { ...x, enabled: e.target.checked } : x)) }))}
              aria-label={`Use ${s.label}`}
            />
            <Input className="h-8" value={s.label} onChange={(e) => setBp((b) => ({ ...b, statuses: b.statuses.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) }))} />
          </div>
        ))}
      </div>
      <div className="mt-8">
        <Label>How do you prioritise the portfolio?</Label>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { key: "simple", label: "Simple priority", hint: "Urgent, high, medium, low" },
            { key: "moscow", label: "MoSCoW commit", hint: "Must, should, could, won't now" },
            { key: "weighted", label: "Weighted scoring", hint: "Your criteria, your weights" },
          ].map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={() => update({ priorityModel: o.key as Blueprint["priorityModel"] })}
              className={cn("rounded-xl border p-4 text-left", bp.priorityModel === o.key ? "border-brand-500 bg-brand-50/50 ring-1 ring-brand-500" : "border-[var(--border)]")}
            >
              <span className="font-medium text-navy-950">{o.label}</span>
              <span className="mt-1 block text-sm text-[var(--muted)]">{o.hint}</span>
            </button>
          ))}
        </div>
      </div>
      {bp.priorityModel === "weighted" ? (
        <div className="mt-6 rounded-xl border border-[var(--border)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium text-navy-950">Scoring criteria</p>
            <label className="flex items-center gap-2 text-sm text-navy-700">
              Score each on a scale of 1 to
              <Select className="h-8 w-20" value={bp.scoring.scale} onChange={(e) => setBp((b) => ({ ...b, scoring: { ...b.scoring, scale: Number(e.target.value) as 3 | 5 } }))}>
                <option value={3}>3</option>
                <option value={5}>5</option>
              </Select>
            </label>
          </div>
          <div className="mt-3 space-y-2">
            {bp.scoring.criteria.map((c, i) => (
              <div key={i} className="grid grid-cols-[1fr_110px_auto] gap-2">
                <Input value={c.label} placeholder="Criterion" onChange={(e) => setCriteria(bp.scoring.criteria.map((x, j) => (j === i ? { ...x, label: e.target.value, key: x.key || slug(e.target.value) } : x)))} />
                <div className="relative">
                  <Input type="number" min={0} max={100} value={c.weight} onChange={(e) => setCriteria(bp.scoring.criteria.map((x, j) => (j === i ? { ...x, weight: Number(e.target.value) } : x)))} />
                  <span className="pointer-events-none absolute right-3 top-2.5 text-sm text-[var(--muted)]">%</span>
                </div>
                <button type="button" className={buttonClass("ghost")} onClick={() => setCriteria(bp.scoring.criteria.filter((_, j) => j !== i))} aria-label="Remove criterion">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <button type="button" className={buttonClass("secondary", "sm")} onClick={() => setCriteria([...bp.scoring.criteria, { key: `c${Date.now().toString(36)}`, label: "", weight: 0 }])}>
              <Plus className="h-4 w-4" /> Add criterion
            </button>
            <span className={cn("text-sm font-medium", total === 100 ? "text-emerald-600" : "text-red-600")}>Total {total}%{total === 100 ? "" : " — must be 100%"}</span>
          </div>
          {bp.scoring.criteria.length ? (
            <p className="mt-3 text-xs text-[var(--muted)]">
              Score = {bp.scoring.criteria.map((c) => `${c.label || "?"} × ${((Number(c.weight) || 0) / 10).toString()}`).join(" + ")} (range {10 * (total / 100)}–{bp.scoring.scale * 10 * (total / 100)})
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 30) || `c${Date.now().toString(36)}`;
}

function StepTeam({ bp, update, extras, setExtras, has }: { bp: Blueprint; update: (p: Partial<Blueprint>) => void; extras: WizardExtras; setExtras: React.Dispatch<React.SetStateAction<WizardExtras>>; has: (f: string) => boolean }) {
  const setDisc = (d: Blueprint["disciplines"]) => update({ disciplines: d });
  return (
    <>
      <StepTitle title="Team and capacity" body="Disciplines let you plan hours by type of work. Add the people you plan with, even if they won't log in." />
      <Label>Disciplines and default hours per project-day</Label>
      <div className="space-y-2">
        {bp.disciplines.map((d, i) => (
          <div key={i} className="grid grid-cols-[1fr_120px_auto] gap-2">
            <Input value={d.label} placeholder="e.g. Electrical engineer" onChange={(e) => setDisc(bp.disciplines.map((x, j) => (j === i ? { ...x, label: e.target.value, key: x.key || slug(e.target.value) } : x)))} />
            <div className="relative">
              <Input type="number" min={0} max={24} step={0.5} value={d.hoursPerProjectDay} onChange={(e) => setDisc(bp.disciplines.map((x, j) => (j === i ? { ...x, hoursPerProjectDay: Number(e.target.value) } : x)))} />
              <span className="pointer-events-none absolute right-3 top-2.5 text-sm text-[var(--muted)]">h</span>
            </div>
            <button type="button" className={buttonClass("ghost")} onClick={() => setDisc(bp.disciplines.filter((_, j) => j !== i))} aria-label="Remove discipline">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <button type="button" className={buttonClass("secondary", "sm")} onClick={() => setDisc([...bp.disciplines, { key: `d${Date.now().toString(36)}`, label: "", hoursPerProjectDay: 4 }])}>
          <Plus className="h-4 w-4" /> Add discipline
        </button>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label="Project capacity per person per quarter" hint="Hours available for project work, after operations and leave.">
          <Input type="number" min={0} value={bp.capacityPerQuarter} onChange={(e) => update({ capacityPerQuarter: Number(e.target.value) })} />
        </Field>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <Label className="mb-0">People you plan with</Label>
          {!has("resources") ? <span className="text-xs text-[var(--muted)]"><Lock className="mr-1 inline h-3 w-3" />Capacity planning is on Premium</span> : null}
        </div>
        <p className="mb-2 text-sm text-[var(--muted)]">You&apos;re added automatically. Leave empty to start with a sample team.</p>
        <div className="space-y-2">
          {extras.people.map((p, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[1.4fr_1.2fr_1fr_100px_auto]">
              <Input placeholder="Name" value={p.name} onChange={(e) => setExtras((x) => ({ ...x, people: x.people.map((q, j) => (j === i ? { ...q, name: e.target.value } : q)) }))} />
              <Select value={p.discipline} onChange={(e) => setExtras((x) => ({ ...x, people: x.people.map((q, j) => (j === i ? { ...q, discipline: e.target.value } : q)) }))}>
                {bp.disciplines.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
              </Select>
              <Select value={p.employment_type} onChange={(e) => setExtras((x) => ({ ...x, people: x.people.map((q, j) => (j === i ? { ...q, employment_type: e.target.value as WizardExtras["people"][number]["employment_type"] } : q)) }))}>
                <option value="fte">Employee</option>
                <option value="contractor">Contractor</option>
                <option value="backfill">Backfill / vacancy</option>
                <option value="pool">Pool</option>
              </Select>
              <Input type="number" value={p.capacity} aria-label="Hours per quarter" onChange={(e) => setExtras((x) => ({ ...x, people: x.people.map((q, j) => (j === i ? { ...q, capacity: Number(e.target.value) } : q)) }))} />
              <button type="button" className={buttonClass("ghost")} onClick={() => setExtras((x) => ({ ...x, people: x.people.filter((_, j) => j !== i) }))} aria-label="Remove person">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            className={buttonClass("secondary", "sm")}
            onClick={() => setExtras((x) => ({ ...x, people: [...x.people, { name: "", discipline: bp.disciplines[0]?.key ?? "", employment_type: "fte", capacity: bp.capacityPerQuarter }] }))}
          >
            <Plus className="h-4 w-4" /> Add person
          </button>
        </div>
      </div>

      <div className="mt-8">
        <Label>Invite colleagues to log in</Label>
        <p className="mb-2 text-sm text-[var(--muted)]">They get a personal invitation link you can share from Settings.</p>
        <div className="space-y-2">
          {extras.invites.map((inv, i) => (
            <div key={i} className="grid grid-cols-[1fr_160px_auto] gap-2">
              <Input type="email" placeholder="colleague@company.com" value={inv.email} onChange={(e) => setExtras((x) => ({ ...x, invites: x.invites.map((q, j) => (j === i ? { ...q, email: e.target.value } : q)) }))} />
              <Select value={inv.role} onChange={(e) => setExtras((x) => ({ ...x, invites: x.invites.map((q, j) => (j === i ? { ...q, role: e.target.value as WizardExtras["invites"][number]["role"] } : q)) }))}>
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="member">Member</option>
                <option value="guest">Guest (read-only)</option>
              </Select>
              <button type="button" className={buttonClass("ghost")} onClick={() => setExtras((x) => ({ ...x, invites: x.invites.filter((_, j) => j !== i) }))} aria-label="Remove invitation">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button type="button" className={buttonClass("secondary", "sm")} onClick={() => setExtras((x) => ({ ...x, invites: [...x.invites, { email: "", role: "member" }] }))}>
            <Plus className="h-4 w-4" /> Add invitation
          </button>
        </div>
      </div>
    </>
  );
}

function StepGovernance({ bp, update, setBp, has }: { bp: Blueprint; update: (p: Partial<Blueprint>) => void; setBp: SetBp; has: (f: string) => boolean }) {
  const m = bp.modules;
  const setMod = (patch: Partial<Blueprint["modules"]>) => update({ modules: { ...m, ...patch } });
  const setMeetings = (meetings: MeetingSeries[]) => setBp((b) => ({ ...b, governance: { ...b.governance, meetings } }));
  return (
    <>
      <StepTitle title="Portfolio and governance" body="Turn on the parts of the loop you want, and schedule the meetings that keep it running." />
      <div className="grid gap-3 sm:grid-cols-2">
        <Toggle checked={m.portfolio} onChange={(v) => setMod({ portfolio: v })} label="Portfolio loop" hint="Intake form, backlog, scoring, commit per quarter, monitor and control." locked={has("portfolio") ? undefined : "Premium"} />
        <Toggle checked={m.resources} onChange={(v) => setMod({ resources: v })} label="Capacity planning" hint="Hours by person, discipline and quarter." locked={has("resources") ? undefined : "Premium"} />
        <Toggle checked={m.governance} onChange={(v) => setMod({ governance: v })} label="Governance meetings" hint="Recurring meetings with auto-built agendas and a RAID log." locked={has("meetings") ? undefined : "Premium"} />
        <Toggle checked={m.charters} onChange={(v) => setMod({ charters: v })} label="Project charters" hint="Decision, budget baseline vs forecast, leads and scope per project." />
        <Toggle checked={false} onChange={() => undefined} label="Budgets, POs and earned value" hint="Finance per project and portfolio." locked="Gold" />
        <Toggle checked={false} onChange={() => undefined} label="RACI matrix and change requests" hint="Who does what, and controlled change." locked="Gold" />
      </div>

      {m.governance && has("meetings") ? (
        <div className="mt-8">
          <Label>Recurring meetings</Label>
          <div className="space-y-3">
            {bp.governance.meetings.map((s, i) => (
              <div key={i} className="rounded-xl border border-[var(--border)] p-3">
                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <Input value={s.name} onChange={(e) => setMeetings(bp.governance.meetings.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                  <button type="button" className={buttonClass("ghost")} onClick={() => setMeetings(bp.governance.meetings.filter((_, j) => j !== i))} aria-label="Remove meeting">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-5">
                  <Select value={s.type} onChange={(e) => setMeetings(bp.governance.meetings.map((x, j) => (j === i ? { ...x, type: e.target.value as MeetingSeries["type"] } : x)))}>
                    <option value="governance">Governance</option>
                    <option value="review">Review</option>
                    <option value="planning">Planning</option>
                    <option value="standup">Stand-up</option>
                    <option value="retro">Retro</option>
                  </Select>
                  <Select value={s.rule} onChange={(e) => setMeetings(bp.governance.meetings.map((x, j) => (j === i ? { ...x, rule: e.target.value as MeetingSeries["rule"] } : x)))}>
                    <option value="1">1st of the month</option>
                    <option value="2">2nd of the month</option>
                    <option value="3">3rd of the month</option>
                    <option value="4">4th of the month</option>
                    <option value="weekly">Every week</option>
                    <option value="biweekly">Every 2 weeks</option>
                  </Select>
                  <Select value={s.weekday} onChange={(e) => setMeetings(bp.governance.meetings.map((x, j) => (j === i ? { ...x, weekday: Number(e.target.value) } : x)))}>
                    {[1, 2, 3, 4, 5].map((d) => <option key={d} value={d}>{WEEKDAYS[d]}</option>)}
                  </Select>
                  <Input type="time" value={s.time} onChange={(e) => setMeetings(bp.governance.meetings.map((x, j) => (j === i ? { ...x, time: e.target.value } : x)))} />
                  <Select value={s.durationMinutes} onChange={(e) => setMeetings(bp.governance.meetings.map((x, j) => (j === i ? { ...x, durationMinutes: Number(e.target.value) } : x)))}>
                    {[15, 30, 45, 60, 90, 120].map((d) => <option key={d} value={d}>{d} min</option>)}
                  </Select>
                </div>
                <p className="mt-2 text-xs text-[var(--muted)]">{describeRule(s)} at {s.time}</p>
              </div>
            ))}
            <button
              type="button"
              className={buttonClass("secondary", "sm")}
              onClick={() => setMeetings([...bp.governance.meetings, { name: "Weekly project review", type: "review", weekday: 1, rule: "weekly", time: "09:00", durationMinutes: 30 }])}
            >
              <Plus className="h-4 w-4" /> Add meeting series
            </button>
          </div>
          <div className="mt-4 max-w-xs">
            <Field label="Intake cut-off before governance" hint="Requests after this go to the next meeting.">
              <Select value={bp.governance.intakeCutoffHours} onChange={(e) => update({ governance: { ...bp.governance, intakeCutoffHours: Number(e.target.value) } })}>
                {[0, 24, 48, 72].map((h) => <option key={h} value={h}>{h ? `${h} hours` : "No cut-off"}</option>)}
              </Select>
            </Field>
          </div>
        </div>
      ) : null}

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Field label="Categories" hint="Comma-separated, e.g. CAPEX, M&R, Compliance">
          <Input value={bp.categories.join(", ")} onChange={(e) => update({ categories: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
        </Field>
        <Field label="Sites or locations" hint="Comma-separated, optional">
          <Input value={bp.sites.join(", ")} onChange={(e) => update({ sites: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
        </Field>
      </div>
    </>
  );
}

function StepImport({
  bp,
  features,
  extras,
  setExtras,
  imports,
  onImported,
}: {
  bp: Blueprint;
  features: string[];
  extras: WizardExtras;
  setExtras: React.Dispatch<React.SetStateAction<WizardExtras>>;
  imports: { target: ImportTarget; created: number; file: string }[];
  onImported: (r: { target: ImportTarget; created: number; file: string }) => void;
}) {
  return (
    <>
      <StepTitle
        title="Bring your existing work"
        body="Upload an Excel tracker, a CSV or an MS Planner export. Match its columns to fields, check the preview, then import. You can import several files, one after another, or skip this and do it later."
      />
      {imports.length ? (
        <div className="mb-6 rounded-xl border border-brand-300 bg-brand-50 p-4">
          <p className="flex items-center gap-2 font-medium text-navy-950">
            <Check className="h-4 w-4 text-brand-700" /> Imported so far
          </p>
          <ul className="mt-2 space-y-1 text-sm text-navy-800">
            {imports.map((r, i) => (
              <li key={i}>
                {r.created} {TARGETS.find((t) => t.key === r.target)?.label.toLowerCase() ?? r.target} from {r.file}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-[var(--muted)]">Sample data is now off, so your workspace starts with only your own work. You can switch it back on in the last step.</p>
        </div>
      ) : null}
      <Importer
        embedded
        features={features}
        criteria={bp.scoring.criteria}
        projectLabel={bp.levels.project.label}
        onImported={onImported}
      />
      {!imports.length ? (
        <div className="mt-6">
          <Toggle
            checked={extras.goToImport}
            onChange={(v) => setExtras((x) => ({ ...x, goToImport: v }))}
            label="I'll do it later: open the importer when setup finishes"
            hint="You can also find it any time under Import in the sidebar."
          />
        </div>
      ) : null}
    </>
  );
}

function StepReview({ bp, extras, setExtras, has, rerun }: { bp: Blueprint; extras: WizardExtras; setExtras: React.Dispatch<React.SetStateAction<WizardExtras>>; has: (f: string) => boolean; rerun: boolean }) {
  const rows: [string, string][] = [
    ["Company", `${bp.company.name} · fiscal year from ${monthName(bp.company.fiscalYearStartMonth)} · ${bp.company.timezone}`],
    ["Method", METHODOLOGIES.find((m) => m.key === bp.methodology)?.label ?? bp.methodology],
    ["Structure", [bp.levels.program.enabled && bp.levels.program.label, bp.levels.project.label, bp.levels.phase.enabled && bp.levels.phase.label, bp.levels.task.label].filter(Boolean).join(" → ")],
    ["Views", bp.views.join(", ") + ` (default: ${bp.defaultView})`],
    ["Sprints", bp.sprints.enabled && has("agile") ? bp.sprints.cadence : "Off"],
    ["Statuses", bp.statuses.filter((s) => s.enabled).map((s) => s.label).join(", ")],
    ["Prioritisation", bp.priorityModel === "weighted" ? bp.scoring.criteria.map((c) => `${c.label} ${c.weight}%`).join(" · ") : bp.priorityModel],
    ["Disciplines", bp.disciplines.map((d) => d.label).join(", ")],
    ["Capacity", `${bp.capacityPerQuarter} h per person per quarter`],
    ["Modules", Object.entries(bp.modules).filter(([, v]) => v).map(([k]) => k).join(", ") || "—"],
    ["Meetings", bp.modules.governance ? bp.governance.meetings.map((m) => `${m.name} (${describeRule(m)})`).join("; ") || "None" : "Off"],
  ];
  return (
    <>
      <StepTitle title={rerun ? "Review your changes" : "Ready to build your workspace"} body="Here's what you chose. Go back to change anything." />
      <dl className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)]">
        {rows.map(([k, v]) => (
          <div key={k} className="grid gap-1 px-4 py-3 sm:grid-cols-[160px_1fr]">
            <dt className="text-sm font-medium text-[var(--muted)]">{k}</dt>
            <dd className="text-sm text-navy-900">{v}</dd>
          </div>
        ))}
      </dl>
      {!rerun ? (
        <div className="mt-6">
          <Toggle
            checked={extras.sampleData}
            onChange={(v) => setExtras((x) => ({ ...x, sampleData: v }))}
            label="Add sample projects and requests"
            hint="See every view with realistic data straight away. Remove it in one click from Settings."
          />
        </div>
      ) : (
        <p className="mt-6 rounded-lg bg-navy-50 p-3 text-sm text-navy-700">Your existing projects, tasks and data stay as they are. Only the workspace settings change.</p>
      )}
    </>
  );
}
