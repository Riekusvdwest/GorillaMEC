"use client";

import { useEffect, useState } from "react";
import { Square, Play } from "lucide-react";
import { startTimer, stopTimer } from "@/app/app/actions/work";
import { cn } from "@/lib/utils";

function elapsed(since: string) {
  const s = Math.max(0, Math.floor((Date.now() - new Date(since).getTime()) / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h ? `${h}:` : ""}${String(m).padStart(h ? 2 : 1, "0")}:${String(sec).padStart(2, "0")}`;
}

export function RunningTimer({ since, label }: { since: string; label: string }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <form action={stopTimer} className="flex items-center gap-2 rounded-full bg-brand-500 py-1 pl-3 pr-1 text-sm text-navy-950 shadow">
      <span className="h-2 w-2 animate-pulse rounded-full bg-navy-950" aria-hidden />
      <span className="max-w-[180px] truncate">{label}</span>
      <span className="font-mono tabular-nums">{elapsed(since)}</span>
      <button type="submit" className="flex h-7 w-7 items-center justify-center rounded-full bg-navy-950/10 hover:bg-navy-950/20" aria-label="Stop timer">
        <Square className="h-3.5 w-3.5 fill-current" />
      </button>
    </form>
  );
}

export function StartTimerButton({ taskId, projectId, running, className }: { taskId: string; projectId: string | null; running?: boolean; className?: string }) {
  return (
    <form action={running ? stopTimer : startTimer} className={className}>
      <input type="hidden" name="task_id" value={taskId} />
      <input type="hidden" name="project_id" value={projectId ?? ""} />
      <button
        type="submit"
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-full border transition-colors",
          running ? "border-brand-500 bg-brand-500 text-navy-950" : "border-navy-200 text-navy-400 hover:border-brand-500 hover:text-brand-700",
        )}
        aria-label={running ? "Stop timer" : "Start timer"}
        title={running ? "Stop timer" : "Start timer"}
      >
        {running ? <Square className="h-3 w-3 fill-current" /> : <Play className="h-3 w-3 fill-current" />}
      </button>
    </form>
  );
}
