// The workspace blueprint: everything the onboarding wizard asks. The app reads
// it to decide which menus, views, fields, labels and statuses appear.

export type Methodology = "waterfall" | "scrum" | "kanban" | "tasks" | "hybrid";
export type ViewKey = "list" | "kanban" | "timeline" | "eisenhower" | "calendar";
export type PriorityModel = "simple" | "eisenhower" | "moscow" | "weighted" | "wsjf" | "rice";
export type TaskStatus = "not_started" | "planned" | "in_progress" | "blocked" | "delayed" | "completed" | "cancelled";
export type Priority = "urgent" | "high" | "medium" | "low";
export type Bucket = "today" | "urgent_important" | "important_not_urgent" | "urgent_not_important" | "neither";
export type SprintCadence = "1w" | "2w" | "3w" | "4w" | "quarter";
export type MeetingType = "governance" | "review" | "standup" | "planning" | "retro" | "other";

export interface Criterion { key: string; label: string; weight: number }
export interface Discipline { key: string; label: string; hoursPerProjectDay: number }
export interface MeetingSeries {
  name: string;
  type: MeetingType;
  /** 1 = Monday … 5 = Friday */
  weekday: number;
  /** "1".."4" = nth weekday of the month, "weekly", "biweekly" */
  rule: "1" | "2" | "3" | "4" | "weekly" | "biweekly";
  time: string; // "10:00"
  durationMinutes: number;
}

export interface Blueprint {
  preset: string;
  company: {
    name: string;
    industry: string;
    teamSize: string;
    country: string;
    timezone: string;
    currency: string;
    fiscalYearStartMonth: number;
    hoursPerDay: number;
    daysPerWeek: number;
  };
  methodology: Methodology;
  levels: {
    program: { enabled: boolean; label: string };
    project: { label: string };
    phase: { enabled: boolean; label: string };
    task: { label: string };
  };
  views: ViewKey[];
  defaultView: ViewKey;
  sprints: { enabled: boolean; cadence: SprintCadence };
  estimation: "hours" | "points" | "tshirt";
  timeTracking: boolean;
  statuses: { key: TaskStatus; label: string; enabled: boolean }[];
  priorityModel: PriorityModel;
  scoring: { scale: 3 | 5; criteria: Criterion[] };
  disciplines: Discipline[];
  capacityPerQuarter: number;
  phaseTemplate: string[];
  governance: { meetings: MeetingSeries[]; intakeCutoffHours: number };
  modules: { portfolio: boolean; resources: boolean; governance: boolean; eisenhower: boolean; charters: boolean };
  categories: string[];
  sites: string[];
}

export const ALL_STATUSES: { key: TaskStatus; label: string; category: "todo" | "active" | "blocked" | "done" }[] = [
  { key: "not_started", label: "Not started", category: "todo" },
  { key: "planned", label: "Planned", category: "todo" },
  { key: "in_progress", label: "In progress", category: "active" },
  { key: "blocked", label: "Blocked", category: "blocked" },
  { key: "delayed", label: "Delayed", category: "blocked" },
  { key: "completed", label: "Completed", category: "done" },
  { key: "cancelled", label: "Cancelled", category: "done" },
];

export const PRIORITIES: { key: Priority; label: string }[] = [
  { key: "urgent", label: "Urgent" },
  { key: "high", label: "High" },
  { key: "medium", label: "Medium" },
  { key: "low", label: "Low" },
];

export const BUCKETS: { key: Bucket; label: string; hint: string }[] = [
  { key: "today", label: "Need to do today", hint: "Do it now" },
  { key: "urgent_important", label: "Urgent & important", hint: "Do first" },
  { key: "important_not_urgent", label: "Important, not urgent", hint: "Schedule" },
  { key: "urgent_not_important", label: "Urgent, not important", hint: "Delegate" },
  { key: "neither", label: "Not urgent, not important", hint: "Drop or park" },
];

export const METHODOLOGIES: { key: Methodology; label: string; blurb: string; bestFor: string }[] = [
  { key: "waterfall", label: "Waterfall", blurb: "Phases, milestones and a Gantt with dependencies.", bestFor: "Fixed scope, construction, capital projects" },
  { key: "scrum", label: "Agile / Scrum", blurb: "Backlog, sprints, story points and burndown.", bestFor: "Evolving scope, software, product teams" },
  { key: "kanban", label: "Kanban", blurb: "Continuous flow with WIP limits and cycle time.", bestFor: "Support, operations, maintenance" },
  { key: "tasks", label: "Task tracker", blurb: "Simple lists, due dates and a personal My Work view.", bestFor: "Small teams and individuals" },
  { key: "hybrid", label: "Hybrid", blurb: "Portfolio intake and prioritisation, waterfall projects, agile delivery.", bestFor: "PMOs and engineering programmes" },
];

export const PRESETS: { key: string; label: string; description: string }[] = [
  { key: "critical_facilities", label: "Engineering & critical facilities", description: "Portfolio loop, weighted scoring, discipline capacity, governance cadence, four-phase project template." },
  { key: "construction", label: "Construction & MEP projects", description: "Waterfall phases, Gantt, permits and handover, contractor hours." },
  { key: "software", label: "Software & product", description: "Scrum with two-week sprints, story points and a ranked backlog." },
  { key: "services", label: "Agency & professional services", description: "Kanban boards, time tracking and client projects." },
  { key: "simple", label: "Simple task tracking", description: "Lists, Kanban and an Eisenhower matrix. Nothing more." },
];

const CRITICAL_SCORING: Criterion[] = [
  { key: "safety", label: "Safety", weight: 25 },
  { key: "availability", label: "Availability", weight: 50 },
  { key: "compliance", label: "Compliance", weight: 20 },
  { key: "energy", label: "Energy", weight: 5 },
];

const ENGINEERING_DISCIPLINES: Discipline[] = [
  { key: "pm", label: "Project Manager", hoursPerProjectDay: 1 },
  { key: "ee", label: "Electrical Engineer", hoursPerProjectDay: 2 },
  { key: "me", label: "Mechanical Engineer", hoursPerProjectDay: 2 },
  { key: "tech", label: "Technician", hoursPerProjectDay: 8 },
  { key: "ctr_pm", label: "Contractor PM", hoursPerProjectDay: 2 },
  { key: "ctr_eng", label: "Contractor engineer", hoursPerProjectDay: 4 },
];

function statuses(enabled: TaskStatus[]): Blueprint["statuses"] {
  return ALL_STATUSES.map((s) => ({ key: s.key, label: s.label, enabled: enabled.includes(s.key) }));
}

export function presetBlueprint(preset: string, companyName = ""): Blueprint {
  const base: Blueprint = {
    preset,
    company: {
      name: companyName,
      industry: "engineering",
      teamSize: "6-30",
      country: "Netherlands",
      timezone: "Europe/Amsterdam",
      currency: "EUR",
      fiscalYearStartMonth: 1,
      hoursPerDay: 8,
      daysPerWeek: 5,
    },
    methodology: "hybrid",
    levels: {
      program: { enabled: true, label: "Program" },
      project: { label: "Project" },
      phase: { enabled: true, label: "Phase" },
      task: { label: "Task" },
    },
    views: ["list", "kanban", "timeline", "eisenhower"],
    defaultView: "list",
    sprints: { enabled: false, cadence: "2w" },
    estimation: "hours",
    timeTracking: true,
    statuses: statuses(["not_started", "in_progress", "blocked", "completed", "cancelled"]),
    priorityModel: "simple",
    scoring: { scale: 3, criteria: [] },
    disciplines: [{ key: "member", label: "Team member", hoursPerProjectDay: 4 }],
    capacityPerQuarter: 480,
    phaseTemplate: [],
    governance: { meetings: [], intakeCutoffHours: 24 },
    modules: { portfolio: false, resources: false, governance: false, eisenhower: true, charters: false },
    categories: [],
    sites: [],
  };

  switch (preset) {
    case "critical_facilities":
      return {
        ...base,
        company: { ...base.company, industry: "critical_facilities", fiscalYearStartMonth: 7 },
        methodology: "hybrid",
        sprints: { enabled: true, cadence: "quarter" },
        statuses: statuses(["not_started", "planned", "in_progress", "blocked", "delayed", "completed", "cancelled"]),
        priorityModel: "weighted",
        scoring: { scale: 3, criteria: CRITICAL_SCORING },
        disciplines: ENGINEERING_DISCIPLINES,
        capacityPerQuarter: 490,
        phaseTemplate: ["Initiation", "Contracting", "Implementation", "Close-out"],
        governance: {
          intakeCutoffHours: 24,
          meetings: [
            { name: "Monthly governance — backlog, prioritise, allocate", type: "governance", weekday: 4, rule: "1", time: "10:00", durationMinutes: 90 },
            { name: "Biweekly review — hygiene, blockers, priority check", type: "review", weekday: 4, rule: "3", time: "10:00", durationMinutes: 60 },
          ],
        },
        modules: { portfolio: true, resources: true, governance: true, eisenhower: true, charters: true },
        categories: ["CAPEX Site Reliability", "CAPEX End of Life", "M&R Project", "Program", "Compliance", "Operations"],
        sites: [],
      };
    case "construction":
      return {
        ...base,
        company: { ...base.company, industry: "construction" },
        methodology: "waterfall",
        views: ["list", "timeline", "kanban", "eisenhower"],
        defaultView: "timeline",
        statuses: statuses(["not_started", "planned", "in_progress", "blocked", "delayed", "completed", "cancelled"]),
        priorityModel: "moscow",
        disciplines: ENGINEERING_DISCIPLINES,
        capacityPerQuarter: 480,
        phaseTemplate: ["Design", "Procurement", "Construction", "Commissioning", "Handover"],
        modules: { portfolio: true, resources: true, governance: true, eisenhower: true, charters: true },
        categories: ["New build", "Refurbishment", "Maintenance"],
      };
    case "software":
      return {
        ...base,
        company: { ...base.company, industry: "software" },
        methodology: "scrum",
        levels: { program: { enabled: false, label: "Program" }, project: { label: "Product" }, phase: { enabled: true, label: "Epic" }, task: { label: "Story" } },
        views: ["kanban", "list", "timeline"],
        defaultView: "kanban",
        sprints: { enabled: true, cadence: "2w" },
        estimation: "points",
        timeTracking: false,
        statuses: statuses(["not_started", "in_progress", "blocked", "completed", "cancelled"]),
        priorityModel: "weighted",
        scoring: {
          scale: 5,
          criteria: [
            { key: "value", label: "Business value", weight: 40 },
            { key: "time", label: "Time criticality", weight: 30 },
            { key: "risk", label: "Risk reduction", weight: 30 },
          ],
        },
        disciplines: [
          { key: "dev", label: "Developer", hoursPerProjectDay: 6 },
          { key: "design", label: "Designer", hoursPerProjectDay: 4 },
          { key: "qa", label: "QA", hoursPerProjectDay: 4 },
          { key: "pm", label: "Product manager", hoursPerProjectDay: 2 },
        ],
        governance: {
          intakeCutoffHours: 24,
          meetings: [
            { name: "Sprint planning", type: "planning", weekday: 1, rule: "biweekly", time: "10:00", durationMinutes: 60 },
            { name: "Retrospective", type: "retro", weekday: 5, rule: "biweekly", time: "15:00", durationMinutes: 45 },
          ],
        },
        modules: { portfolio: true, resources: false, governance: true, eisenhower: false, charters: false },
      };
    case "services":
      return {
        ...base,
        company: { ...base.company, industry: "services" },
        methodology: "kanban",
        levels: { program: { enabled: true, label: "Client" }, project: { label: "Project" }, phase: { enabled: false, label: "Phase" }, task: { label: "Task" } },
        views: ["kanban", "list", "timeline", "eisenhower"],
        defaultView: "kanban",
        disciplines: [
          { key: "consultant", label: "Consultant", hoursPerProjectDay: 6 },
          { key: "designer", label: "Designer", hoursPerProjectDay: 6 },
          { key: "account", label: "Account manager", hoursPerProjectDay: 2 },
        ],
        modules: { portfolio: false, resources: true, governance: false, eisenhower: true, charters: false },
      };
    default:
      return {
        ...base,
        preset: "simple",
        company: { ...base.company, industry: "other" },
        methodology: "tasks",
        levels: { program: { enabled: false, label: "Program" }, project: { label: "List" }, phase: { enabled: false, label: "Phase" }, task: { label: "Task" } },
        views: ["list", "kanban", "eisenhower"],
      };
  }
}

/** Fills any gaps in a stored blueprint with defaults so old configs keep working. */
export function normalizeBlueprint(raw: unknown): Blueprint {
  const cfg = (raw && typeof raw === "object" ? raw : {}) as Partial<Blueprint>;
  const base = presetBlueprint(cfg.preset || "simple", cfg.company?.name || "");
  return {
    ...base,
    ...cfg,
    company: { ...base.company, ...(cfg.company || {}) },
    levels: {
      program: { ...base.levels.program, ...(cfg.levels?.program || {}) },
      project: { ...base.levels.project, ...(cfg.levels?.project || {}) },
      phase: { ...base.levels.phase, ...(cfg.levels?.phase || {}) },
      task: { ...base.levels.task, ...(cfg.levels?.task || {}) },
    },
    sprints: { ...base.sprints, ...(cfg.sprints || {}) },
    scoring: { ...base.scoring, ...(cfg.scoring || {}) },
    governance: { ...base.governance, ...(cfg.governance || {}) },
    modules: { ...base.modules, ...(cfg.modules || {}) },
    statuses: Array.isArray(cfg.statuses) && cfg.statuses.length ? cfg.statuses : base.statuses,
    views: Array.isArray(cfg.views) && cfg.views.length ? cfg.views : base.views,
  };
}

export function statusLabel(bp: Blueprint | null, key: string) {
  return bp?.statuses.find((s) => s.key === key)?.label || ALL_STATUSES.find((s) => s.key === key)?.label || key;
}

export function enabledStatuses(bp: Blueprint) {
  return bp.statuses.filter((s) => s.enabled);
}

export function statusCategory(key: string) {
  return ALL_STATUSES.find((s) => s.key === key)?.category ?? "todo";
}

export function plural(label: string) {
  if (/[^aeiou]y$/i.test(label)) return label.slice(0, -1) + "ies";
  if (/(s|x|ch|sh)$/i.test(label)) return label + "es";
  return label + "s";
}

/** Suggests a methodology from the five "help me choose" answers. */
export function recommendMethodology(a: { scope: string; cadence: string; portfolio: string; team: string; work: string }): { key: Methodology; why: string } {
  if (a.portfolio === "yes" && a.scope !== "evolving") {
    return { key: "hybrid", why: "You juggle many requests competing for the same people, so you need intake and prioritisation above your projects, with phases inside them." };
  }
  if (a.work === "flow") return { key: "kanban", why: "Your work arrives continuously rather than in projects, so a flow board with WIP limits fits best." };
  if (a.scope === "evolving" && a.cadence === "short") return { key: "scrum", why: "Scope changes often and you can ship in short cycles, which is what sprints are for." };
  if (a.scope === "fixed") return { key: "waterfall", why: "Scope is fixed up front and work follows phases, so a Gantt with milestones fits." };
  if (a.team === "solo") return { key: "tasks", why: "A small team needs clear lists and due dates, not ceremony." };
  return { key: "hybrid", why: "Your work mixes planned phases and changing priorities, so hybrid gives you both." };
}
