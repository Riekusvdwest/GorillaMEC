import { Badge, Dot } from "@/components/ui";
import { statusCategory, statusLabel, type Blueprint } from "@/lib/blueprint";
import { BACKLOG_STATUSES, PROJECT_HEALTH, type BacklogItem, type Project } from "@/lib/types";

export function TaskStatusBadge({ status, bp }: { status: string; bp: Blueprint }) {
  const cat = statusCategory(status);
  const tone = status === "cancelled" ? "neutral" : cat === "done" ? "green" : cat === "blocked" ? "red" : cat === "active" ? "blue" : "neutral";
  return <Badge tone={tone}>{statusLabel(bp, status)}</Badge>;
}

export function PriorityBadge({ priority }: { priority: string }) {
  const tone = priority === "urgent" ? "red" : priority === "high" ? "amber" : priority === "low" ? "neutral" : "blue";
  if (priority === "medium") return null;
  return <Badge tone={tone}>{priority[0]!.toUpperCase() + priority.slice(1)}</Badge>;
}

export function HealthBadge({ health }: { health: Project["health"] }) {
  const tone = health === "on_track" ? "green" : health === "at_risk" ? "amber" : health === "behind" ? "red" : "grey";
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-navy-800">
      <Dot tone={tone} /> {PROJECT_HEALTH.find((h) => h.key === health)?.label ?? health}
    </span>
  );
}

export function BacklogStatusBadge({ status }: { status: BacklogItem["status"] }) {
  const tone =
    status === "new" ? "brand" : status === "blocked" ? "red" : status === "done" ? "green" : status === "in_progress" || status === "in_sprint" ? "blue" : status === "deferred" || status === "cancelled" ? "neutral" : "amber";
  return <Badge tone={tone}>{BACKLOG_STATUSES.find((s) => s.key === status)?.label ?? status}</Badge>;
}

export function RagDot({ rag }: { rag: BacklogItem["rag"] }) {
  if (rag === "high") return <Dot tone="red" />;
  if (rag === "medium") return <Dot tone="amber" />;
  return <Dot tone="green" />;
}

export function ScorePill({ score, max }: { score: number | null; max: number }) {
  if (score === null || score === undefined) return <span className="text-sm text-navy-300">—</span>;
  const pct = max ? score / max : 0;
  const cls = pct >= 0.8 ? "bg-brand-500 text-navy-950" : pct >= 0.65 ? "bg-brand-100 text-brand-900" : "bg-navy-100 text-navy-700";
  return <span className={`inline-flex min-w-[3rem] justify-center rounded-md px-2 py-0.5 text-sm font-semibold tabular-nums ${cls}`}>{Number(score).toFixed(1)}</span>;
}
