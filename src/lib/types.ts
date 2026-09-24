// Row types mirroring supabase/migrations. Keep in sync when the schema changes.
import type { Bucket, Priority, TaskStatus } from "@/lib/blueprint";

export type Role = "owner" | "admin" | "manager" | "member" | "guest";
export type PlanName = "trial" | "basic" | "premium" | "gold";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  plan: PlanName;
  subscription_status: string;
  trial_ends_at: string | null;
  current_period_end: string | null;
  stripe_customer_id: string | null;
  extra_seats: number;
  created_at: string;
}

export interface Membership {
  organization_id: string;
  user_id: string;
  role: Role;
  created_at: string;
}

export interface Person {
  id: string;
  organization_id: string;
  name: string;
  email: string | null;
  user_id: string | null;
  discipline: string | null;
  role_title: string | null;
  employment_type: "fte" | "contractor" | "backfill" | "pool";
  capacity_hours_per_quarter: number;
  active: boolean;
  notes: string | null;
  is_demo: boolean;
}

export interface Project {
  id: string;
  organization_id: string;
  program_id: string | null;
  code: string | null;
  name: string;
  description: string | null;
  scope: string | null;
  methodology: string;
  status: "not_started" | "active" | "on_hold" | "completed" | "cancelled";
  health: "on_track" | "at_risk" | "behind" | "not_started" | "closed";
  category: string | null;
  site: string | null;
  decision: "keep" | "defer" | "no_bandwidth" | "cancel" | "transfer" | null;
  owner_label: string | null;
  lead_person_id: string | null;
  pm_person_id: string | null;
  start_date: string | null;
  end_date: string | null;
  budget_original: number | null;
  budget_current: number | null;
  committed_quarter: string | null;
  reference_links: string | null;
  backlog_item_id: string | null;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface Phase {
  id: string;
  project_id: string;
  name: string;
  position: number;
}

export interface ChecklistItem { text: string; done: boolean }

export interface Task {
  id: string;
  organization_id: string;
  project_id: string | null;
  phase_id: string | null;
  parent_id: string | null;
  sprint_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  bucket: Bucket | null;
  assignee_id: string | null;
  person_id: string | null;
  resource_type: string | null;
  estimate_hours: number | null;
  story_points: number | null;
  start_date: string | null;
  due_date: string | null;
  completed_at: string | null;
  percent_complete: number;
  position: number;
  labels: string[];
  checklist: ChecklistItem[];
  reference: string | null;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
}

export interface BacklogItem {
  id: string;
  organization_id: string;
  number: number;
  title: string;
  description: string | null;
  justification: string | null;
  requestor_name: string | null;
  requestor_email: string | null;
  requestor_role: string | null;
  source: "health_dashboard" | "internal" | "external" | "incident" | "audit";
  pillar: string | null;
  category: string | null;
  site: string | null;
  business_impact: "critical" | "high" | "medium" | "low" | null;
  target_quarter: string | null;
  downtime_required: boolean | null;
  dependencies: string | null;
  suggested_solution: string | null;
  suggested_owner: string | null;
  external_link: string | null;
  status: "new" | "triaged" | "ready" | "in_backlog" | "in_sprint" | "in_progress" | "blocked" | "deferred" | "cancelled" | "done";
  rag: "none" | "medium" | "high";
  ready_for_prioritization: boolean;
  scores: Record<string, number>;
  score: number | null;
  committed_priority: number | null;
  committed_quarter: string | null;
  planned_start: string | null;
  planned_end: string | null;
  percent_complete: number;
  pillar_impact: string | null;
  kpi_moved: boolean | null;
  new_issue_raised: boolean | null;
  feedback_to_backlog: boolean | null;
  mc_date: string | null;
  parent_item_id: string | null;
  project_id: string | null;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Allocation {
  id: string;
  organization_id: string;
  backlog_item_id: string | null;
  project_id: string | null;
  person_id: string | null;
  discipline: string;
  quarter: string | null;
  hours: number;
}

export interface ItemUpdate {
  id: string;
  backlog_item_id: string | null;
  project_id: string | null;
  task_id: string | null;
  body: string;
  author_id: string | null;
  created_at: string;
}

export interface Meeting {
  id: string;
  organization_id: string;
  series: string | null;
  title: string;
  meeting_type: "governance" | "review" | "standup" | "planning" | "retro" | "other";
  starts_at: string;
  duration_minutes: number;
  chair: string | null;
  attendees: string | null;
  agenda: string | null;
  minutes: string | null;
  is_demo: boolean;
}

export interface RaidItem {
  id: string;
  project_id: string | null;
  kind: "risk" | "assumption" | "issue" | "decision" | "action";
  title: string;
  description: string | null;
  probability: number | null;
  impact: number | null;
  owner: string | null;
  due_date: string | null;
  status: "open" | "in_progress" | "closed";
  created_at: string;
}

export interface TimeEntry {
  id: string;
  user_id: string;
  task_id: string | null;
  project_id: string | null;
  started_at: string;
  ended_at: string | null;
  minutes: number | null;
  note: string | null;
}

export const BACKLOG_STATUSES: { key: BacklogItem["status"]; label: string }[] = [
  { key: "new", label: "New" },
  { key: "triaged", label: "Triaged" },
  { key: "ready", label: "Ready for prioritisation" },
  { key: "in_backlog", label: "In backlog" },
  { key: "in_sprint", label: "In sprint" },
  { key: "in_progress", label: "In progress" },
  { key: "blocked", label: "Blocked" },
  { key: "deferred", label: "Deferred" },
  { key: "cancelled", label: "Cancelled" },
  { key: "done", label: "Done" },
];

export const SOURCES: { key: BacklogItem["source"]; label: string }[] = [
  { key: "health_dashboard", label: "Health dashboard" },
  { key: "internal", label: "Internal request" },
  { key: "external", label: "External request" },
  { key: "incident", label: "Incident" },
  { key: "audit", label: "Audit" },
];

export const COMMITTED_PRIORITIES = [
  { value: 1, label: "1 – Must do" },
  { value: 2, label: "2 – Should do" },
  { value: 3, label: "3 – Could do" },
  { value: 4, label: "4 – Won't do now" },
];

export const PROJECT_HEALTH: { key: Project["health"]; label: string }[] = [
  { key: "on_track", label: "On track" },
  { key: "at_risk", label: "At risk" },
  { key: "behind", label: "Behind" },
  { key: "not_started", label: "Not started" },
  { key: "closed", label: "Closed" },
];

export const PROJECT_STATUS: { key: Project["status"]; label: string }[] = [
  { key: "not_started", label: "Not started" },
  { key: "active", label: "Active" },
  { key: "on_hold", label: "On hold" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

export const DECISIONS: { key: NonNullable<Project["decision"]>; label: string }[] = [
  { key: "keep", label: "Keep" },
  { key: "defer", label: "Defer" },
  { key: "no_bandwidth", label: "No bandwidth" },
  { key: "cancel", label: "Cancel" },
  { key: "transfer", label: "Transfer ownership" },
];
