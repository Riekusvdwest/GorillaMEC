"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const OPTIONS = [
  {
    key: "waterfall",
    label: "Waterfall",
    headline: "Phases, milestones and a Gantt your contractors understand.",
    points: ["Phase templates (initiation → contracting → implementation → close-out)", "Timeline with start/finish dates and progress", "Project charter with budget baseline vs forecast", "Hours per task by discipline, rolled up to the project"],
    views: ["Timeline", "List", "Charter"],
  },
  {
    key: "agile",
    label: "Agile / Scrum",
    headline: "A ranked backlog, sprints and a board that keeps moving.",
    points: ["Backlog ranked by value or weighted score", "Sprints from 1 week to a full quarter", "Story points, hours or T-shirt sizes", "Board with drag-and-drop status changes"],
    views: ["Board", "Backlog", "Sprint"],
  },
  {
    key: "kanban",
    label: "Kanban",
    headline: "Continuous flow for operations and maintenance work.",
    points: ["Board by status with blocked and delayed lanes", "Priorities and Eisenhower buckets", "Recurring tasks for routine work", "My Work view per person"],
    views: ["Board", "List", "Eisenhower"],
  },
  {
    key: "tasks",
    label: "Task tracker",
    headline: "Just lists, dates and focus. No ceremony.",
    points: ["Personal My Work: overdue, today, this week", "Eisenhower matrix for what matters", "Start/stop timer on any task", "Import your Excel or MS Planner tasks in minutes"],
    views: ["My Work", "List", "Eisenhower"],
  },
  {
    key: "hybrid",
    label: "Hybrid",
    headline: "Portfolio governance on top, the right method underneath.",
    points: ["Intake form feeding one backlog for every request", "Weighted scoring and committed priority per quarter", "Capacity by person and discipline before you commit", "Waterfall projects and agile delivery side by side"],
    views: ["Portfolio", "Capacity", "Meetings"],
  },
];

export function MethodologyPicker() {
  const [active, setActive] = useState("hybrid");
  const opt = OPTIONS.find((o) => o.key === active)!;
  return (
    <div className="mt-12">
      <div role="tablist" aria-label="Ways of working" className="flex flex-wrap gap-2">
        {OPTIONS.map((o) => (
          <button
            key={o.key}
            role="tab"
            aria-selected={o.key === active}
            onClick={() => setActive(o.key)}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
              o.key === active ? "border-brand-500 bg-brand-500 text-navy-950" : "border-navy-200 bg-white text-navy-700 hover:border-navy-400",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="mt-6 grid gap-8 rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm sm:p-8 md:grid-cols-[1.3fr_1fr]">
        <div>
          <h3 className="text-2xl font-semibold text-navy-950">{opt.headline}</h3>
          <ul className="mt-5 space-y-3">
            {opt.points.map((p) => (
              <li key={p} className="flex gap-3 text-navy-800">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-hidden />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="blueprint-light rounded-xl border border-[var(--border)] bg-navy-50/50 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Your workspace opens with</p>
          <div className="mt-4 space-y-2">
            {opt.views.map((v, i) => (
              <div key={v} className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-white px-4 py-3 shadow-sm">
                <span className="font-medium text-navy-900">{v}</span>
                <span className="text-xs text-[var(--muted)]">{i === 0 ? "default view" : "enabled"}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-[var(--muted)]">Change your mind later: re-run the setup wizard any time and the workspace reshapes itself.</p>
        </div>
      </div>
    </div>
  );
}
