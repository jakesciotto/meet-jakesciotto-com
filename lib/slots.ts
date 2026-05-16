import { fromZonedTime } from "date-fns-tz";

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
  };
};

const MS_PER_MINUTE = 60 * 1000;

export function computeSlots(input: ComputeSlotsInput): Slot[] {
  const { date, rules, busyRanges, bookings, now, config } = input;
  const { slotMinutes, slotAlignmentMinutes, minNoticeHours, hostTz } = config;

  if (rules.length === 0) return [];

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
