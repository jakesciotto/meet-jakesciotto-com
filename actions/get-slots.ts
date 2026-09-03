"use server";

import { fromZonedTime } from "date-fns-tz";
import { serviceClient } from "@/lib/supabase";
import { getFreeBusy } from "@/lib/google-calendar";
import {
  computeSlots,
  rulesForDate,
  type AvailabilityRule,
  type BusyRange,
  type Slot,
} from "@/lib/slots";
import { getCachedSlots, setCachedSlots } from "@/lib/slots-cache";
import { loadSettings } from "@/lib/settings";
import { isMeetingDuration, slotAlignmentFor, type MeetingDuration } from "@/lib/durations";
import { config } from "@/lib/config";
import { addDays, todayInTz, weekdayOf } from "@/lib/dates";

function dayBoundsUtc(date: string, tz: string): { startIso: string; endIso: string } {
  const start = fromZonedTime(`${date}T00:00:00`, tz);
  const end = fromZonedTime(`${addDays(date, 1)}T00:00:00`, tz);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

type WindowRow = { start_minute: number; end_minute: number };

function toRules(rows: WindowRow[]): AvailabilityRule[] {
  return rows.map((r) => ({ startMinute: r.start_minute, endMinute: r.end_minute }));
}

export async function getSlots(date: string, duration: MeetingDuration): Promise<Slot[]> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Invalid date format. Expected YYYY-MM-DD.");
  }
  if (!isMeetingDuration(duration)) {
    throw new Error("Invalid meeting length.");
  }

  const cacheKey = `${date}:${duration}`;
  const cached = getCachedSlots(cacheKey);
  if (cached) return cached;

  const supabase = serviceClient();
  const settings = await loadSettings(supabase);

  const today = todayInTz(config.hostTz);
  if (date < today || date > addDays(today, settings.horizonDays)) return [];

  const weekday = weekdayOf(date);
  const { startIso, endIso } = dayBoundsUtc(date, config.hostTz);

  const [rulesRes, overridesRes, blockedRes, bookingsRes, busyRanges] = await Promise.all([
    supabase
      .from("availability_rules")
      .select("start_minute, end_minute")
      .eq("weekday", weekday),
    supabase.from("date_overrides").select("start_minute, end_minute").eq("date", date),
    supabase.from("blocked_dates").select("date").eq("date", date),
    supabase
      .from("bookings")
      .select("starts_at, ends_at")
      .gte("starts_at", startIso)
      .lt("starts_at", endIso)
      .is("cancelled_at", null),
    getFreeBusy(startIso, endIso),
  ]);

  if (rulesRes.error) throw new Error(rulesRes.error.message);
  if (overridesRes.error) throw new Error(overridesRes.error.message);
  if (blockedRes.error) throw new Error(blockedRes.error.message);
  if (bookingsRes.error) throw new Error(bookingsRes.error.message);

  const rules = rulesForDate(date, {
    rulesByWeekday: { [weekday]: toRules(rulesRes.data) },
    overridesByDate: overridesRes.data.length > 0 ? { [date]: toRules(overridesRes.data) } : {},
    blockedDates: new Set(blockedRes.data.map((b) => b.date)),
  });
  const bookings: BusyRange[] = bookingsRes.data.map((b) => ({
    start: new Date(b.starts_at),
    end: new Date(b.ends_at),
  }));

  const slots = computeSlots({
    date,
    rules,
    busyRanges,
    bookings,
    now: new Date(),
    config: {
      slotMinutes: duration,
      slotAlignmentMinutes: slotAlignmentFor(duration),
      minNoticeHours: settings.minNoticeHours,
      hostTz: config.hostTz,
      maxBookingsPerDay: settings.maxBookingsPerDay,
    },
  });

  setCachedSlots(cacheKey, slots);
  return slots;
}
