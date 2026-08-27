import { requireAdmin } from "@/lib/auth";
import { serviceClient } from "@/lib/supabase";
import { loadSettings } from "@/lib/settings";
import { adminLogout } from "@/actions/admin-auth";
import { AvailabilityEditor } from "@/components/admin/availability-editor";
import {
  DateOverridesEditor,
  type BlockedDate,
  type OpenDate,
} from "@/components/admin/date-overrides-editor";
import { SettingsEditor } from "@/components/admin/settings-editor";
import { Button } from "@/components/ui/button";

type RulesByWeekday = Record<number, { startMinute: number; endMinute: number }[]>;

async function loadAdminData() {
  const supabase = serviceClient();
  const [settings, rulesRes, datesRes, overridesRes] = await Promise.all([
    loadSettings(supabase),
    supabase.from("availability_rules").select("weekday, start_minute, end_minute"),
    supabase.from("blocked_dates").select("date, note").order("date", { ascending: true }),
    supabase
      .from("date_overrides")
      .select("date, start_minute, end_minute, note")
      .order("date", { ascending: true })
      .order("start_minute", { ascending: true }),
  ]);
  if (rulesRes.error) throw new Error(rulesRes.error.message);
  if (datesRes.error) throw new Error(datesRes.error.message);
  if (overridesRes.error) throw new Error(overridesRes.error.message);

  const rules: RulesByWeekday = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
  for (const r of rulesRes.data) {
    rules[r.weekday].push({ startMinute: r.start_minute, endMinute: r.end_minute });
  }
  for (const k of Object.keys(rules).map(Number)) {
    rules[k].sort((a, b) => a.startMinute - b.startMinute);
  }

  const blocked: BlockedDate[] = datesRes.data.map((d) => ({ date: d.date, note: d.note }));

  const openByDate = new Map<string, OpenDate>();
  for (const o of overridesRes.data) {
    const entry: OpenDate = openByDate.get(o.date) ?? {
      date: o.date,
      windows: [],
      note: o.note,
    };
    entry.windows.push({ startMinute: o.start_minute, endMinute: o.end_minute });
    openByDate.set(o.date, entry);
  }

  return { settings, rules, blocked, open: [...openByDate.values()] };
}

export default async function AdminPage() {
  const session = await requireAdmin();
  const { settings, rules, blocked, open } = await loadAdminData();

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Admin
          </h1>
          <p className="text-sm text-muted-foreground">
            Signed in as {session.email}
          </p>
        </div>
        <form action={adminLogout}>
          <Button type="submit" variant="outline" size="sm">
            Sign out
          </Button>
        </form>
      </header>

      <section className="mb-10 space-y-3">
        <h2 className="border-b border-primary/20 pb-1 text-sm font-medium text-muted-foreground">
          Weekly availability
        </h2>
        <p className="text-sm text-muted-foreground">
          Each day can have one or more windows. Slots are generated in 30-minute increments
          within each window.
        </p>
        <AvailabilityEditor initial={rules} />
      </section>

      <section className="mb-10 space-y-3">
        <h2 className="border-b border-primary/20 pb-1 text-sm font-medium text-muted-foreground">
          Date overrides
        </h2>
        <p className="text-sm text-muted-foreground">
          Block a day or a range (vacation, trips, holidays), or open a day with specific
          hours. An override replaces the weekly schedule for that date.
        </p>
        <DateOverridesEditor blocked={blocked} open={open} />
      </section>

      <section className="space-y-3">
        <h2 className="border-b border-primary/20 pb-1 text-sm font-medium text-muted-foreground">
          Booking rules
        </h2>
        <p className="text-sm text-muted-foreground">
          Limits that apply to every booking. Changes take effect on the next page load.
        </p>
        <SettingsEditor initial={settings} />
      </section>
    </main>
  );
}
