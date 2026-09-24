// Fiscal calendar helpers. A fiscal year that starts in July and is named after
// the calendar year it ends in: July 2026 – June 2027 = FY27, Q1 = Jul–Sep.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export interface FiscalQuarter {
  key: string; // e.g. "FY27-Q1"
  label: string; // e.g. "Q1 FY27 (Jul–Sep 2026)"
  short: string; // e.g. "Q1 FY27"
  start: Date;
  end: Date; // inclusive last day
}

/** startMonth is 1-12 (7 = July). */
export function fiscalQuarterOf(date: Date, startMonth = 1): FiscalQuarter {
  const m0 = date.getMonth(); // 0-11
  const offset = (m0 - (startMonth - 1) + 12) % 12; // months since FY start
  const q = Math.floor(offset / 3) + 1;
  const fyStartYear = m0 >= startMonth - 1 ? date.getFullYear() : date.getFullYear() - 1;
  return quarter(fyStartYear, q, startMonth);
}

export function quarter(fyStartYear: number, q: number, startMonth = 1): FiscalQuarter {
  const start = new Date(fyStartYear, startMonth - 1 + (q - 1) * 3, 1);
  const end = new Date(start.getFullYear(), start.getMonth() + 3, 0);
  const fyName = startMonth === 1 ? fyStartYear : fyStartYear + 1;
  const fy = `FY${String(fyName).slice(-2)}`;
  const range = `${MONTHS[start.getMonth()]}–${MONTHS[end.getMonth()]} ${end.getFullYear()}`;
  return { key: `${fy}-Q${q}`, label: `Q${q} ${fy} (${range})`, short: `Q${q} ${fy}`, start, end };
}

/** The current fiscal year's four quarters plus `extra` following quarters. */
export function upcomingQuarters(now: Date, startMonth = 1, extra = 2): FiscalQuarter[] {
  const fyStartYear = now.getMonth() >= startMonth - 1 ? now.getFullYear() : now.getFullYear() - 1;
  const out: FiscalQuarter[] = [];
  for (let i = 0; i < 4 + extra; i++) {
    out.push(quarter(fyStartYear + Math.floor(i / 4), (i % 4) + 1, startMonth));
  }
  return out;
}

export function quarterByKey(key: string | null | undefined, startMonth = 1): FiscalQuarter | null {
  if (!key) return null;
  const m = /^FY(\d{2})-Q([1-4])$/.exec(key);
  if (!m) return null;
  const fyName = 2000 + Number(m[1]);
  const fyStartYear = startMonth === 1 ? fyName : fyName - 1;
  return quarter(fyStartYear, Number(m[2]), startMonth);
}

export function monthName(m: number) {
  return ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][m - 1];
}
