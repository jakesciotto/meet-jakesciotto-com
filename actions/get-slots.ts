"use server";

import { fromZonedTime } from "date-fns-tz";
import { serviceClient } from "@/lib/supabase";
import { getFreeBusy } from "@/lib/google-calendar";
import { computeSlots, type AvailabilityRule, type BusyRange, type Slot } from "@/lib/slots";
import { config } from "@/lib/config";
import { weekdayOf } from "@/lib/dates";

type CacheEntry = { expires: number; slots: Slot[] };
const CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

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

  const cacheKey = date;
  const cached = CACHE.get(cacheKey);
  if (cached && cached.expires > Date.now()) return cached.slots;

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
    CACHE.set(cacheKey, { expires: Date.now() + CACHE_TTL_MS, slots: [] });
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

  CACHE.set(cacheKey, { expires: Date.now() + CACHE_TTL_MS, slots });
  return slots;
}

export function invalidateSlotsCache(): void {
  CACHE.clear();
}
