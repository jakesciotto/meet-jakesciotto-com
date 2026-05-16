"use server";

import { z } from "zod";
import { serviceClient } from "@/lib/supabase";
import { deleteEvent } from "@/lib/google-calendar";
import { clearSlotsCache } from "@/lib/slots-cache";

const InputSchema = z.object({ bookingId: z.string().uuid() });

export type CancelBookingResult =
  | { ok: true }
  | { ok: false; error: "not_found" | "already_cancelled" | "unknown"; message: string };

export async function cancelBooking(
  rawInput: z.infer<typeof InputSchema>
): Promise<CancelBookingResult> {
  const parsed = InputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: "unknown", message: parsed.error.message };
  }

  const supabase = serviceClient();
  const { data: booking, error } = await supabase
    .from("bookings")
    .select("id, google_event_id, cancelled_at")
    .eq("id", parsed.data.bookingId)
    .single();

  if (error || !booking) return { ok: false, error: "not_found", message: "Booking not found." };
  if (booking.cancelled_at) {
    return { ok: false, error: "already_cancelled", message: "This booking is already cancelled." };
  }

  try {
    await deleteEvent(booking.google_event_id);
  } catch (e) {
    console.error("Failed to delete Google event during cancellation", e);
    return {
      ok: false,
      error: "unknown",
      message: "We couldn't reach Google Calendar. Try again.",
    };
  }

  const { error: updateError } = await supabase
    .from("bookings")
    .update({ cancelled_at: new Date().toISOString() })
    .eq("id", booking.id);
  if (updateError) {
    console.error("Cancelled event but failed to mark audit row", updateError);
  }

  clearSlotsCache();

  return { ok: true };
}
