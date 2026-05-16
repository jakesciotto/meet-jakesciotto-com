"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { serviceClient } from "@/lib/supabase";

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

  revalidatePath("/admin");
  revalidatePath("/");
}

const AddBlockedSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().max(200).optional(),
});

export async function addBlockedDate(rawInput: z.infer<typeof AddBlockedSchema>): Promise<void> {
  await requireAdmin();
  const { date, note } = AddBlockedSchema.parse(rawInput);
  const supabase = serviceClient();
  const { error } = await supabase.from("blocked_dates").upsert({ date, note });
  if (error) throw new Error(`Upsert failed: ${error.message}`);
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function removeBlockedDate(date: string): Promise<void> {
  await requireAdmin();
  const { error } = await serviceClient().from("blocked_dates").delete().eq("date", date);
  if (error) throw new Error(`Delete failed: ${error.message}`);
  revalidatePath("/admin");
  revalidatePath("/");
}
