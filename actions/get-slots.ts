"use server";

import { fromZonedTime } from "date-fns-tz";
import { serviceClient } from "@/lib/supabase";
import { getFreeBusy } from "@/lib/google-calendar";
import { computeSlots, type AvailabilityRule, type BusyRange, type Slot } from "@/lib/slots";
import { getCachedSlots, setCachedSlots } from "@/lib/slots-cache";
import { config } from "@/lib/config";
import { weekdayOf } from "@/lib/dates";

function dayBoundsUtc(date: string, tz: string): { startIso: string; endIso: string } {
  const start = fromZonedTime(`${date}T00:00:00`, tz);
  const end = fromZonedTime(`${date}T00:00:00`, tz);
  end.setUTCDate(end.getUTCDate() + 1);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

export async function getSlots(date: string): Promise<Slot[]> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Invalid date format. Expected YYYY-MM-DD.");
  }

  const cached = getCachedSlots(date);
  if (cached) return cached;

  const supabase = serviceClient();
  const weekday = weekdayOf(date);
  const { startIso, endIso } = dayBoundsUtc(date, config.hostTz);

  const [rulesRes, blockedRes, bookingsRes, busyRanges] = await Promise.all([
    supabase
      .from("availability_rules")
      .select("start_minute, end_minute")
      .eq("weekday", weekday),
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
  if (blockedRes.error) throw new Error(blockedRes.error.message);
  if (bookingsRes.error) throw new Error(bookingsRes.error.message);

  if (blockedRes.data.length > 0) {
    setCachedSlots(date, []);
    return [];
  }

  const rules: AvailabilityRule[] = rulesRes.data.map((r) => ({
    startMinute: r.start_minute,
    endMinute: r.end_minute,
  }));
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
      slotMinutes: config.slotMinutes,
      slotAlignmentMinutes: config.slotAlignmentMinutes,
      minNoticeHours: config.minNoticeHours,
      hostTz: config.hostTz,
    },
  });

  setCachedSlots(date, slots);
  return slots;
}
