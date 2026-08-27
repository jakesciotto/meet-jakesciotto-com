import { fromZonedTime } from "date-fns-tz";
import { cacheLife } from "next/cache";
import { BookingPicker } from "@/components/booking-picker";
import { serviceClient } from "@/lib/supabase";
import { getFreeBusy } from "@/lib/google-calendar";
import { config } from "@/lib/config";
import { loadSettings } from "@/lib/settings";
import { addDays, eachDay, todayInTz } from "@/lib/dates";
import { rulesForDate, type AvailabilityRule } from "@/lib/slots";

async function loadHomeData() {
  "use cache";
  cacheLife("minutes");
  const supabase = serviceClient();
  const settings = await loadSettings(supabase);
  const from = todayInTz(config.hostTz);
  const to = addDays(from, settings.horizonDays);

  const horizonStart = fromZonedTime(`${from}T00:00:00`, config.hostTz);
  const horizonEnd = fromZonedTime(`${to}T00:00:00`, config.hostTz);
  horizonEnd.setUTCDate(horizonEnd.getUTCDate() + 1);
  const horizonStartIso = horizonStart.toISOString();
  const horizonEndIso = horizonEnd.toISOString();

  const [rulesRes, overridesRes, blockedRes, bookingsRes, busyRanges] = await Promise.all([
    supabase
      .from("availability_rules")
      .select("weekday, start_minute, end_minute"),
    supabase
      .from("date_overrides")
      .select("date, start_minute, end_minute")
      .gte("date", from)
      .lte("date", to),
    supabase
      .from("blocked_dates")
      .select("date")
      .gte("date", from)
      .lte("date", to),
    supabase
      .from("bookings")
      .select("starts_at, ends_at")
      .gte("starts_at", horizonStartIso)
      .lt("starts_at", horizonEndIso)
      .is("cancelled_at", null),
    getFreeBusy(horizonStartIso, horizonEndIso),
  ]);

  if (rulesRes.error) throw new Error(rulesRes.error.message);
  if (overridesRes.error) throw new Error(overridesRes.error.message);
  if (blockedRes.error) throw new Error(blockedRes.error.message);
  if (bookingsRes.error) throw new Error(bookingsRes.error.message);

  const rulesByWeekday: Record<number, AvailabilityRule[]> = {};
  for (const r of rulesRes.data) {
    if (!rulesByWeekday[r.weekday]) rulesByWeekday[r.weekday] = [];
    rulesByWeekday[r.weekday].push({
      startMinute: r.start_minute,
      endMinute: r.end_minute,
    });
  }

  const overridesByDate: Record<string, AvailabilityRule[]> = {};
  for (const o of overridesRes.data) {
    (overridesByDate[o.date] ??= []).push({
      startMinute: o.start_minute,
      endMinute: o.end_minute,
    });
  }

  const sources = {
    rulesByWeekday,
    overridesByDate,
    blockedDates: new Set(blockedRes.data.map((b) => b.date)),
  };
  const disabledDates = eachDay(from, to).filter(
    (d) => rulesForDate(d, sources).length === 0,
  );

  return {
    fromDate: from,
    toDate: to,
    disabledDates,
    rulesByWeekday,
    overridesByDate,
    bookings: bookingsRes.data.map((b) => ({
      start: b.starts_at,
      end: b.ends_at,
    })),
    busyRanges: busyRanges.map((b) => ({
      start: b.start.toISOString(),
      end: b.end.toISOString(),
    })),
    slotConfig: {
      slotMinutes: config.slotMinutes,
      slotAlignmentMinutes: config.slotAlignmentMinutes,
      minNoticeHours: settings.minNoticeHours,
      hostTz: config.hostTz,
      maxBookingsPerDay: settings.maxBookingsPerDay,
    },
  };
}

export default async function HomePage() {
  const data = await loadHomeData();
  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col justify-center px-4 py-10">
      <div className="space-y-6 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500">
        <header className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight lowercase sm:text-3xl">
            book a meeting
          </h1>
          <p className="text-sm text-muted-foreground">
            you lookin&apos; for me?
          </p>
        </header>
        <BookingPicker {...data} />
      </div>
    </main>
  );
}
