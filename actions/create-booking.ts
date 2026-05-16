"use server";

import { z } from "zod";
import { serviceClient } from "@/lib/supabase";
import { insertEvent } from "@/lib/google-calendar";
import { sendConfirmation } from "@/lib/email";
import { config } from "@/lib/config";
import { getSlots } from "./get-slots";
import { clearSlotsCache } from "@/lib/slots-cache";

const InputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startIso: z.string().datetime(),
  name: z.string().min(1).max(100),
  email: z.string().email(),
  conferencing: z.enum(["meet", "phone"]),
  phone: z.string().max(40).optional(),
  notes: z.string().max(1000).optional(),
});

export type CreateBookingInput = z.infer<typeof InputSchema>;

export type CreateBookingResult =
  | { ok: true; bookingId: string }
  | { ok: false; error: "slot_taken" | "validation" | "unknown"; message: string };

export async function createBooking(rawInput: CreateBookingInput): Promise<CreateBookingResult> {
  const parsed = InputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: "validation", message: parsed.error.message };
  }
  const input = parsed.data;

  if (input.conferencing === "phone" && !input.phone) {
    return { ok: false, error: "validation", message: "Phone number is required for phone calls." };
  }

  const slots = await getSlots(input.date);
  const stillFree = slots.some((s) => s.startsAt.toISOString() === input.startIso);
  if (!stillFree) {
    return { ok: false, error: "slot_taken", message: "That time was just taken. Pick another." };
  }

  const startsAt = new Date(input.startIso);
  const endsAt = new Date(startsAt.getTime() + config.slotMinutes * 60 * 1000);

  const description = input.notes
    ? `Booking via meet.jakesciotto.com\n\nNotes:\n${input.notes}`
    : "Booking via meet.jakesciotto.com";

  let event: Awaited<ReturnType<typeof insertEvent>>;
  try {
    event = await insertEvent({
      summary: `Meeting with ${input.name}`,
      description,
      startsAt,
      endsAt,
      attendeeEmail: input.email,
      attendeeName: input.name,
      conferencing: input.conferencing,
      invitee_phone: input.phone,
    });
  } catch (e) {
    console.error("Failed to insert Google Calendar event", e);
    return {
      ok: false,
      error: "unknown",
      message: "We couldn't create the calendar event. Try again, or pick another time.",
    };
  }

  const supabase = serviceClient();
  const { data: inserted, error: insertError } = await supabase
    .from("bookings")
    .insert({
      google_event_id: event.eventId,
      invitee_name: input.name,
      invitee_email: input.email,
      invitee_phone: input.phone ?? null,
      conferencing: input.conferencing,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    console.error("Inserted Google event but failed to write audit row", insertError);
    return {
      ok: false,
      error: "unknown",
      message: "Booking partially succeeded. Contact Jake directly to confirm.",
    };
  }

  clearSlotsCache();

  try {
    await sendConfirmation({
      bookingId: inserted.id,
      inviteeName: input.name,
      inviteeEmail: input.email,
      startsAt,
      endsAt,
      conferencing: input.conferencing,
      meetLink: event.meetLink,
      inviteePhone: input.phone,
    });
  } catch (e) {
    console.error("Confirmation email failed (booking still created)", e);
  }

  return { ok: true, bookingId: inserted.id };
}
