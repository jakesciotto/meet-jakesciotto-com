import { toZonedTime } from "date-fns-tz";

export function todayInTz(tz: string, now: Date = new Date()): string {
  const z = toZonedTime(now, tz);
  return formatYmd(z);
}

export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return formatYmd(date);
}

export function weekdayOf(isoDate: string): number {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function eachDay(fromInclusive: string, toInclusive: string): string[] {
  const out: string[] = [];
  let cur = fromInclusive;
  while (cur <= toInclusive) {
    out.push(cur);
    cur = addDays(cur, 1);
  }
  return out;
}

function formatYmd(d: Date): string {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  return `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
