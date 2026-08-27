import { fromZonedTime } from "date-fns-tz";
import { addDays, weekdayOf } from "./dates";

export type AvailabilityRule = {
  /** Minutes from midnight in host TZ, e.g. 9*60 for 9:00am. */
  startMinute: number;
  /** Minutes from midnight in host TZ; exclusive. */
  endMinute: number;
};

export type BusyRange = {
  start: Date;
  end: Date;
};

export type Slot = {
  startsAt: Date;
  endsAt: Date;
};

export type ComputeSlotsInput = {
  /** Date in host TZ, format "YYYY-MM-DD". */
  date: string;
  rules: AvailabilityRule[];
  busyRanges: BusyRange[];
  bookings: BusyRange[];
  now: Date;
  config: {
    slotMinutes: number;
    slotAlignmentMinutes: number;
    minNoticeHours: number;
    hostTz: string;
    /** Non-cancelled bookings allowed per host-TZ day; null or undefined = no limit. */
    maxBookingsPerDay?: number | null;
  };
};

export type RuleSources = {
  rulesByWeekday: Record<number, AvailabilityRule[]>;
  overridesByDate: Record<string, AvailabilityRule[]>;
  blockedDates?: ReadonlySet<string>;
};

/** Blocked wins, then a date override, then the weekly rule. */
export function rulesForDate(date: string, sources: RuleSources): AvailabilityRule[] {
  if (sources.blockedDates?.has(date)) return [];
  const override = sources.overridesByDate[date];
  if (override) return override;
  return sources.rulesByWeekday[weekdayOf(date)] ?? [];
}

const MS_PER_MINUTE = 60 * 1000;

export function computeSlots(input: ComputeSlotsInput): Slot[] {
  const { date, rules, busyRanges, bookings, now, config } = input;
  const { slotMinutes, slotAlignmentMinutes, minNoticeHours, hostTz, maxBookingsPerDay } = config;

  if (rules.length === 0) return [];
  if (isDayFull(date, bookings, maxBookingsPerDay, hostTz)) return [];

  const minStart = now.getTime() + minNoticeHours * 60 * MS_PER_MINUTE;
  const busy = [...busyRanges, ...bookings];
  const slots: Slot[] = [];

  for (const rule of rules) {
    const windowStart = wallClockToUtc(date, rule.startMinute, hostTz);
    const windowEnd = wallClockToUtc(date, rule.endMinute, hostTz);
    const stepMs = slotAlignmentMinutes * MS_PER_MINUTE;
    const durationMs = slotMinutes * MS_PER_MINUTE;

    for (let t = windowStart.getTime(); t + durationMs <= windowEnd.getTime(); t += stepMs) {
      if (t < minStart) continue;
      const startsAt = new Date(t);
      const endsAt = new Date(t + durationMs);
      if (overlapsAny(startsAt, endsAt, busy)) continue;
      slots.push({ startsAt, endsAt });
    }
  }

  slots.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  return slots;
}

function isDayFull(
  date: string,
  bookings: BusyRange[],
  cap: number | null | undefined,
  tz: string,
): boolean {
  if (cap == null) return false;
  const dayStart = wallClockToUtc(date, 0, tz).getTime();
  const dayEnd = wallClockToUtc(addDays(date, 1), 0, tz).getTime();
  let count = 0;
  for (const b of bookings) {
    const s = b.start.getTime();
    if (s >= dayStart && s < dayEnd) count++;
  }
  return count >= cap;
}

function wallClockToUtc(date: string, minuteOfDay: number, tz: string): Date {
  const h = Math.floor(minuteOfDay / 60);
  const m = minuteOfDay % 60;
  const wallClock = `${date}T${pad(h)}:${pad(m)}:00`;
  return fromZonedTime(wallClock, tz);
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function overlapsAny(start: Date, end: Date, ranges: BusyRange[]): boolean {
  const s = start.getTime();
  const e = end.getTime();
  for (const r of ranges) {
    if (s < r.end.getTime() && e > r.start.getTime()) return true;
  }
  return false;
}
