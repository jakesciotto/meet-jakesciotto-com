import { DatePicker } from "@/components/date-picker";
import { publicReadClient } from "@/lib/supabase";
import { config } from "@/lib/config";
import { addDays, eachDay, todayInTz, weekdayOf } from "@/lib/dates";

export const dynamic = "force-dynamic";

async function loadDisabledDates() {
  const supabase = publicReadClient();
  const [rulesRes, blockedRes] = await Promise.all([
    supabase.from("availability_rules").select("weekday"),
    supabase.from("blocked_dates").select("date"),
  ]);
  if (rulesRes.error) throw new Error(rulesRes.error.message);
  if (blockedRes.error) throw new Error(blockedRes.error.message);

  const weekdaysWithRules = new Set(rulesRes.data.map((r) => r.weekday));
  const blockedSet = new Set(blockedRes.data.map((d) => d.date));

  const from = todayInTz(config.hostTz);
  const to = addDays(from, config.horizonDays);
  const disabled = eachDay(from, to).filter(
    (d) => !weekdaysWithRules.has(weekdayOf(d)) || blockedSet.has(d),
  );

  return { from, to, disabled };
}

export default async function HomePage() {
  const { from, to, disabled } = await loadDisabledDates();
  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col justify-center px-4 py-10">
      <div className="space-y-6">
        <header className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            book a meeting
          </h1>
          <p className="text-sm text-muted-foreground">you lookin' for me?</p>
        </header>
        <DatePicker disabledDates={disabled} fromDate={from} toDate={to} />
      </div>
    </main>
  );
}
