"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { serviceClient } from "@/lib/supabase";
import { clearSlotsCache } from "@/lib/slots-cache";

function invalidate(): void {
  clearSlotsCache();
  revalidatePath("/admin");
  revalidatePath("/");
}

const WindowSchema = z
  .object({
    startMinute: z.number().int().min(0).max(1439),
    endMinute: z.number().int().min(1).max(1440),
  })
  .refine((w) => w.endMinute > w.startMinute, { message: "end must be after start" });

const SetWeekdaySchema = z.object({
  weekday: z.number().int().min(0).max(6),
  windows: z.array(WindowSchema),
});

export async function setWeekdayAvailability(
  rawInput: z.infer<typeof SetWeekdaySchema>
): Promise<void> {
  await requireAdmin();
  const { weekday, windows } = SetWeekdaySchema.parse(rawInput);
  const supabase = serviceClient();

  const { error: deleteError } = await supabase
    .from("availability_rules")
    .delete()
    .eq("weekday", weekday);
  if (deleteError) throw new Error(`Delete failed: ${deleteError.message}`);

  if (windows.length > 0) {
    const rows = windows.map((w) => ({
      weekday,
      start_minute: w.startMinute,
      end_minute: w.endMinute,
    }));
    const { error: insertError } = await supabase.from("availability_rules").insert(rows);
    if (insertError) throw new Error(`Insert failed: ${insertError.message}`);
  }

  invalidate();
}

const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const AddBlockedSchema = z.object({
  dates: z.array(IsoDate).min(1).max(366),
  note: z.string().max(200).optional(),
});

export async function addBlockedDates(rawInput: z.infer<typeof AddBlockedSchema>): Promise<void> {
  await requireAdmin();
  const { dates, note } = AddBlockedSchema.parse(rawInput);
  const supabase = serviceClient();

  const { error: unopenError } = await supabase.from("date_overrides").delete().in("date", dates);
  if (unopenError) throw new Error(`Delete failed: ${unopenError.message}`);

  const rows = dates.map((date) => ({ date, note: note ?? null }));
  const { error } = await supabase.from("blocked_dates").upsert(rows);
  if (error) throw new Error(`Upsert failed: ${error.message}`);
  invalidate();
}

const RemoveBlockedSchema = z.object({
  dates: z.array(IsoDate).min(1).max(366),
});

export async function removeBlockedDates(
  rawInput: z.infer<typeof RemoveBlockedSchema>
): Promise<void> {
  await requireAdmin();
  const { dates } = RemoveBlockedSchema.parse(rawInput);
  const { error } = await serviceClient().from("blocked_dates").delete().in("date", dates);
  if (error) throw new Error(`Delete failed: ${error.message}`);
  invalidate();
}

const AddOpenSchema = z.object({
  dates: z.array(IsoDate).min(1).max(366),
  windows: z
    .array(WindowSchema)
    .min(1)
    .refine((ws) => new Set(ws.map((w) => w.startMinute)).size === ws.length, {
      message: "windows must not share a start time",
    }),
  note: z.string().max(200).optional(),
});

export async function addOpenDates(rawInput: z.infer<typeof AddOpenSchema>): Promise<void> {
  await requireAdmin();
  const { dates, windows, note } = AddOpenSchema.parse(rawInput);
  const supabase = serviceClient();

  const { error: unblockError } = await supabase.from("blocked_dates").delete().in("date", dates);
  if (unblockError) throw new Error(`Delete failed: ${unblockError.message}`);

  const { error: deleteError } = await supabase.from("date_overrides").delete().in("date", dates);
  if (deleteError) throw new Error(`Delete failed: ${deleteError.message}`);

  const rows = dates.flatMap((date) =>
    windows.map((w) => ({
      date,
      start_minute: w.startMinute,
      end_minute: w.endMinute,
      note: note ?? null,
    })),
  );
  const { error: insertError } = await supabase.from("date_overrides").insert(rows);
  if (insertError) throw new Error(`Insert failed: ${insertError.message}`);
  invalidate();
}

const RemoveOpenSchema = z.object({
  dates: z.array(IsoDate).min(1).max(366),
});

export async function removeOpenDates(rawInput: z.infer<typeof RemoveOpenSchema>): Promise<void> {
  await requireAdmin();
  const { dates } = RemoveOpenSchema.parse(rawInput);
  const { error } = await serviceClient().from("date_overrides").delete().in("date", dates);
  if (error) throw new Error(`Delete failed: ${error.message}`);
  invalidate();
}

const SettingsSchema = z.object({
  maxBookingsPerDay: z.number().int().min(1).max(100).nullable(),
  minNoticeHours: z.number().int().min(0).max(24 * 30),
  horizonDays: z.number().int().min(1).max(365),
});

export type SettingsInput = z.infer<typeof SettingsSchema>;

export async function updateSettings(rawInput: SettingsInput): Promise<void> {
  await requireAdmin();
  const s = SettingsSchema.parse(rawInput);
  const { error } = await serviceClient()
    .from("settings")
    .upsert({
      id: 1,
      max_bookings_per_day: s.maxBookingsPerDay,
      min_notice_hours: s.minNoticeHours,
      horizon_days: s.horizonDays,
      updated_at: new Date().toISOString(),
    });
  if (error) throw new Error(`Save failed: ${error.message}`);
  invalidate();
}
