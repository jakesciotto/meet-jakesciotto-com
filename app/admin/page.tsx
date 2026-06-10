import { requireAdmin } from "@/lib/auth";
import { serviceClient } from "@/lib/supabase";
import { adminLogout } from "@/actions/admin-auth";
import {
  AvailabilityEditor,
} from "@/components/admin/availability-editor";
import {
  BlockedDatesEditor,
  type BlockedDate,
} from "@/components/admin/blocked-dates-editor";
import { Button } from "@/components/ui/button";

type RulesByWeekday = Record<number, { startMinute: number; endMinute: number }[]>;

async function loadAdminData() {
  const supabase = serviceClient();
  const [rulesRes, datesRes] = await Promise.all([
    supabase.from("availability_rules").select("weekday, start_minute, end_minute"),
    supabase.from("blocked_dates").select("date, note").order("date", { ascending: true }),
  ]);
  if (rulesRes.error) throw new Error(rulesRes.error.message);
  if (datesRes.error) throw new Error(datesRes.error.message);

  const rules: RulesByWeekday = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
  for (const r of rulesRes.data) {
    rules[r.weekday].push({ startMinute: r.start_minute, endMinute: r.end_minute });
  }
  for (const k of Object.keys(rules).map(Number)) {
    rules[k].sort((a, b) => a.startMinute - b.startMinute);
  }

  const dates: BlockedDate[] = datesRes.data.map((d) => ({ date: d.date, note: d.note }));
  return { rules, dates };
}

export default async function AdminPage() {
  const session = await requireAdmin();
  const { rules, dates } = await loadAdminData();

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-mono text-xl font-semibold tracking-widest uppercase">
            Admin
          </h1>
          <p className="font-mono text-sm text-muted-foreground">
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
        <h2 className="border-b border-primary/20 pb-1 font-mono text-sm font-medium tracking-widest text-muted-foreground uppercase">
          Weekly availability
        </h2>
        <p className="text-sm text-muted-foreground">
          Each day can have one or more windows. Slots are generated in 30-minute increments
          within each window.
        </p>
        <AvailabilityEditor initial={rules} />
      </section>

      <section className="space-y-3">
        <h2 className="border-b border-primary/20 pb-1 font-mono text-sm font-medium tracking-widest text-muted-foreground uppercase">
          Blocked dates
        </h2>
        <p className="text-sm text-muted-foreground">
          Block individual days (vacation, holidays) regardless of weekly availability.
        </p>
        <BlockedDatesEditor initial={dates} />
      </section>
    </main>
  );
}
