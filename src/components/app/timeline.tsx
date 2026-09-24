import Link from "next/link";
import { statusCategory } from "@/lib/blueprint";
import { cn, formatShortDate } from "@/lib/utils";

export interface TimelineRow {
  id: string;
  title: string;
  start: string | null;
  end: string | null;
  status: string;
  percent: number;
  group?: string | null;
  href: string;
}

const DAY = 86_400_000;

function monday(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const wd = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - wd);
  return x;
}

function parse(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
}

/** Week-by-week Gantt-style timeline. Rows without dates are listed at the bottom. */
export function Timeline({ rows, maxWeeks = 30 }: { rows: TimelineRow[]; maxWeeks?: number }) {
  const dated = rows.filter((r) => r.start || r.end);
  const undated = rows.filter((r) => !r.start && !r.end);
  if (!dated.length) {
    return <p className="rounded-xl border border-dashed border-navy-200 bg-white p-8 text-center text-sm text-[var(--muted)]">Add start and due dates to see work on the timeline.</p>;
  }
  const today = new Date();
  const starts = dated.map((r) => parse((r.start ?? r.end)!).getTime());
  const ends = dated.map((r) => parse((r.end ?? r.start)!).getTime());
  const first = monday(new Date(Math.min(...starts, today.getTime() - 7 * DAY)));
  let weeks = Math.ceil((Math.max(...ends, today.getTime() + 14 * DAY) - first.getTime()) / (7 * DAY)) + 1;
  weeks = Math.min(Math.max(weeks, 8), maxWeeks);
  const span = weeks * 7 * DAY;
  const pct = (t: number) => Math.max(0, Math.min(100, ((t - first.getTime()) / span) * 100));
  const todayPct = pct(today.getTime());
  const cols = Array.from({ length: weeks }, (_, i) => new Date(first.getTime() + i * 7 * DAY));

  const groups: { name: string | null; rows: TimelineRow[] }[] = [];
  for (const r of dated) {
    const g = groups.find((x) => x.name === (r.group ?? null));
    if (g) g.rows.push(r);
    else groups.push({ name: r.group ?? null, rows: [r] });
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-white">
      <div className="min-w-[900px]">
        <div className="grid grid-cols-[260px_1fr] border-b border-[var(--border)] bg-navy-50/60 text-xs text-[var(--muted)]">
          <div className="px-4 py-2 font-medium">Work</div>
          <div className="relative flex">
            {cols.map((c, i) => (
              <div key={i} className="flex-1 border-l border-[var(--border)] px-1 py-2 text-center">
                {c.getDate() <= 7 || i === 0 ? formatShortDate(c) : c.getDate()}
              </div>
            ))}
          </div>
        </div>
        {groups.map((g) => (
          <div key={g.name ?? "_"}>
            {g.name ? <div className="border-b border-[var(--border)] bg-navy-50/30 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-navy-600">{g.name}</div> : null}
            {g.rows.map((r) => {
              const s = parse((r.start ?? r.end)!).getTime();
              const e = parse((r.end ?? r.start)!).getTime() + DAY;
              const left = pct(s);
              const width = Math.max(1.2, pct(e) - left);
              const cat = statusCategory(r.status);
              const late = cat !== "done" && e < today.getTime();
              return (
                <div key={r.id} className="grid grid-cols-[260px_1fr] border-b border-[var(--border)] last:border-0 hover:bg-navy-50/40">
                  <Link href={r.href} scroll={false} className="truncate px-4 py-2 text-sm text-navy-900 hover:text-brand-800" title={r.title}>
                    {r.title}
                  </Link>
                  <div className="relative h-9">
                    {cols.map((_, i) => (
                      <div key={i} className="absolute inset-y-0 border-l border-[var(--border)]/60" style={{ left: `${(i / weeks) * 100}%` }} />
                    ))}
                    <div className="absolute inset-y-0 w-px bg-brand-500" style={{ left: `${todayPct}%` }} aria-hidden />
                    <Link
                      href={r.href}
                      scroll={false}
                      className={cn(
                        "absolute top-2 h-5 overflow-hidden rounded-md text-[10px] font-medium leading-5 text-white shadow-sm",
                        cat === "done" ? "bg-emerald-500" : late ? "bg-red-500" : cat === "blocked" ? "bg-amber-500" : cat === "active" ? "bg-sky-600" : "bg-navy-400",
                      )}
                      style={{ left: `${left}%`, width: `${width}%` }}
                      title={`${r.title}: ${r.start ?? "?"} → ${r.end ?? "?"}`}
                    >
                      <span className="absolute inset-y-0 left-0 bg-white/25" style={{ width: `${r.percent}%` }} />
                      <span className="relative px-1.5">{r.percent ? `${r.percent}%` : ""}</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {undated.length ? (
        <div className="border-t border-[var(--border)] px-4 py-3 text-xs text-[var(--muted)]">
          {undated.length} item{undated.length === 1 ? "" : "s"} without dates:{" "}
          {undated.slice(0, 6).map((r, i) => (
            <span key={r.id}>
              {i ? ", " : ""}
              <Link href={r.href} scroll={false} className="text-navy-700 hover:underline">{r.title}</Link>
            </span>
          ))}
          {undated.length > 6 ? "…" : ""}
        </div>
      ) : null}
    </div>
  );
}
