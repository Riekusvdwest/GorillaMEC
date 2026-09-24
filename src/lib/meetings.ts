import type { MeetingSeries } from "@/lib/blueprint";

/** Offset in minutes of `timeZone` from UTC at the given instant. */
function tzOffsetMinutes(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return (asUtc - instant.getTime()) / 60000;
}

/** Converts a wall-clock time in `timeZone` to a UTC Date. */
export function zonedToUtc(y: number, m0: number, d: number, hh: number, mm: number, timeZone: string) {
  const guess = new Date(Date.UTC(y, m0, d, hh, mm));
  const offset = tzOffsetMinutes(guess, timeZone);
  const first = new Date(guess.getTime() - offset * 60000);
  const offset2 = tzOffsetMinutes(first, timeZone);
  return offset2 === offset ? first : new Date(guess.getTime() - offset2 * 60000);
}

function nthWeekdayOfMonth(year: number, m0: number, weekday: number, n: number) {
  // weekday: 1 = Monday … 7 = Sunday; JS getDay: 0 = Sunday
  const jsDay = weekday % 7;
  const first = new Date(Date.UTC(year, m0, 1));
  const delta = (jsDay - first.getUTCDay() + 7) % 7;
  const day = 1 + delta + (n - 1) * 7;
  const last = new Date(Date.UTC(year, m0 + 1, 0)).getUTCDate();
  return day <= last ? day : null;
}

/** Occurrences of a meeting series between `from` and `from + months`. */
export function occurrences(series: MeetingSeries, from: Date, months: number, timeZone: string): Date[] {
  const [hh, mm] = series.time.split(":").map(Number);
  const out: Date[] = [];
  const end = new Date(from);
  end.setMonth(end.getMonth() + months);

  if (series.rule === "weekly" || series.rule === "biweekly") {
    const step = series.rule === "weekly" ? 7 : 14;
    const jsDay = series.weekday % 7;
    const d = new Date(Date.UTC(from.getFullYear(), from.getMonth(), from.getDate()));
    d.setUTCDate(d.getUTCDate() + ((jsDay - d.getUTCDay() + 7) % 7));
    while (d < end) {
      const at = zonedToUtc(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), hh ?? 10, mm ?? 0, timeZone);
      if (at >= from) out.push(at);
      d.setUTCDate(d.getUTCDate() + step);
    }
    return out;
  }

  const n = Number(series.rule);
  for (let i = 0; i <= months; i++) {
    const y = from.getFullYear() + Math.floor((from.getMonth() + i) / 12);
    const m0 = (from.getMonth() + i) % 12;
    const day = nthWeekdayOfMonth(y, m0, series.weekday, n);
    if (!day) continue;
    const at = zonedToUtc(y, m0, day, hh ?? 10, mm ?? 0, timeZone);
    if (at >= from && at < end) out.push(at);
  }
  return out;
}

export const WEEKDAYS = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function describeRule(s: MeetingSeries) {
  const day = WEEKDAYS[s.weekday] ?? "";
  if (s.rule === "weekly") return `Every ${day}`;
  if (s.rule === "biweekly") return `Every other ${day}`;
  const nth = ["", "1st", "2nd", "3rd", "4th"][Number(s.rule)];
  return `${nth} ${day} of the month`;
}
