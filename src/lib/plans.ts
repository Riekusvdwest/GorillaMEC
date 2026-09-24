export type PlanKey = "basic" | "premium" | "gold";

export interface Plan {
  key: PlanKey;
  name: string;
  monthly: number;
  annualPerMonth: number; // annual billing = 10 x monthly, shown per month
  users: string;
  tagline: string;
  highlight?: boolean;
  bullets: string[];
}

export const PLANS: Plan[] = [
  {
    key: "basic",
    name: "Basic",
    monthly: 39,
    annualPerMonth: Math.round((39 * 10) / 12),
    users: "Up to 5 users",
    tagline: "Get your own work and a small team organised.",
    bullets: [
      "One way of working per workspace",
      "List, Kanban, Calendar and Eisenhower views",
      "My Work with a start/stop timer",
      "Import from Excel, CSV and MS Planner",
      "Recurring tasks and 5 automation rules",
      "5 GB file storage",
    ],
  },
  {
    key: "premium",
    name: "Premium",
    monthly: 300,
    annualPerMonth: 250,
    users: "Up to 30 users + 50 guests",
    tagline: "Run projects, sprints and a prioritised portfolio as a team.",
    highlight: true,
    bullets: [
      "Mix Waterfall, Agile and Kanban per project",
      "Gantt with dependencies, sprints, burndown",
      "Intake form → backlog → weighted scoring",
      "Capacity planning by discipline and quarter",
      "Governance meetings with auto-built agendas",
      "RAID log and weekly stakeholder updates",
      "100 GB file storage",
    ],
  },
  {
    key: "gold",
    name: "Gold",
    monthly: 1500,
    annualPerMonth: 1250,
    users: "Up to 100 users, then €15/user",
    tagline: "Portfolio governance for a PMO or engineering department.",
    bullets: [
      "Everything in Premium",
      "Portfolio roadmap and what-if scenarios",
      "Budgets, POs, accruals and earned value",
      "RACI matrix, change requests, stage-gate sign-off",
      "Engineering pack: permits, commissioning, snags",
      "SSO, audit log, API and full data export",
      "Onboarding workshops and 99.9% uptime SLA",
    ],
  },
];

export type Cell = boolean | string;
export const COMPARISON: { group: string; rows: { label: string; basic: Cell; premium: Cell; gold: Cell }[] }[] = [
  {
    group: "Workspace",
    rows: [
      { label: "Users included", basic: "5", premium: "30", gold: "100 (+€15/user)" },
      { label: "Guests (view and comment)", basic: false, premium: "50", gold: "Unlimited" },
      { label: "File storage", basic: "5 GB", premium: "100 GB", gold: "1 TB" },
      { label: "Setup wizard and industry templates", basic: true, premium: true, gold: true },
      { label: "Methodology", basic: "One per workspace", premium: "Mixed per project", gold: "Mixed + portfolio layer" },
    ],
  },
  {
    group: "Planning and delivery",
    rows: [
      { label: "List, Kanban, Calendar, Eisenhower", basic: true, premium: true, gold: true },
      { label: "Gantt with dependencies and baselines", basic: "Simple timeline", premium: true, gold: true },
      { label: "Sprints, story points, burndown, retros", basic: false, premium: true, gold: true },
      { label: "Phase templates and project charters", basic: false, premium: true, gold: true },
      { label: "Time tracking", basic: "Personal timer", premium: "Team timesheets", gold: "+ cost rates" },
    ],
  },
  {
    group: "Portfolio",
    rows: [
      { label: "Intake form → backlog", basic: false, premium: true, gold: true },
      { label: "Weighted scoring and committed priority", basic: false, premium: true, gold: true },
      { label: "Capacity by person, discipline and quarter", basic: false, premium: true, gold: true },
      { label: "What-if scenarios and portfolio roadmap", basic: false, premium: false, gold: true },
      { label: "Budgets, POs, earned value", basic: false, premium: false, gold: true },
    ],
  },
  {
    group: "Governance",
    rows: [
      { label: "Meeting series with auto-built agendas", basic: false, premium: true, gold: true },
      { label: "RAID log", basic: false, premium: true, gold: true },
      { label: "Weekly stakeholder update", basic: false, premium: true, gold: true },
      { label: "RACI matrix, change requests, stage gates", basic: false, premium: false, gold: true },
      { label: "Permits, commissioning checklists, snag lists", basic: false, premium: false, gold: true },
    ],
  },
  {
    group: "Security and support",
    rows: [
      { label: "Two-factor sign-in", basic: true, premium: true, gold: true },
      { label: "Custom roles", basic: false, premium: true, gold: true },
      { label: "SSO (SAML / Entra ID), audit log", basic: false, premium: false, gold: true },
      { label: "API, webhooks, full data export", basic: false, premium: false, gold: true },
      { label: "Support", basic: "Email", premium: "Priority email and chat", gold: "Named contact, 99.9% SLA" },
    ],
  },
];

export const FEATURE_PLAN: Record<string, PlanKey> = {
  portfolio: "premium",
  intake: "premium",
  scoring: "premium",
  resources: "premium",
  agile: "premium",
  meetings: "premium",
  raid: "premium",
  stakeholder_update: "premium",
  gantt: "premium",
  finance: "gold",
  raci: "gold",
  scenarios: "gold",
};
