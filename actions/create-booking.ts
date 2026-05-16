"use server";

import { z } from "zod";
import { serviceClient } from "@/lib/supabase";
import { insertEvent } from "@/lib/google-calendar";
import { config } from "@/lib/config";
import { getSlots } from "./get-slots";
import { clearSlotsCache } from "@/lib/slots-cache";

const InputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startIso: z.string().datetime(),
  name: z.string().trim().min(1).max(100),
  company: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email().max(200),
  conferencing: z.enum(["meet", "phone", "other"]),
  phone: z.string().trim().max(40).optional(),
  meetingLink: z.string().trim().url().max(500).optional(),
  notes: z.string().trim().max(1000).optional(),
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
  if (input.conferencing === "other" && !input.meetingLink) {
    return { ok: false, error: "validation", message: "Please paste your meeting link." };
  }

  const slots = await getSlots(input.date);
  const stillFree = slots.some((s) => s.startsAt.toISOString() === input.startIso);
  if (!stillFree) {
    return { ok: false, error: "slot_taken", message: "That time was just taken. Pick another." };
  }

  const startsAt = new Date(input.startIso);
  const endsAt = new Date(startsAt.getTime() + config.slotMinutes * 60 * 1000);

  const description = [
    `Booking via meet.jakesciotto.com`,
    `Company: ${input.company}`,
    input.notes ? `\nNotes:\n${input.notes}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  let event: Awaited<ReturnType<typeof insertEvent>>;
  try {
    event = await insertEvent({
      summary: `Meeting with ${input.name} (${input.company})`,
      description,
      startsAt,
      endsAt,
      attendeeEmail: input.email,
      attendeeName: input.name,
      conferencing: input.conferencing,
      invitee_phone: input.phone,
      meeting_link: input.meetingLink,
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
      invitee_company: input.company,
      invitee_email: input.email,
      invitee_phone: input.phone ?? null,
      meeting_link: input.meetingLink ?? null,
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

  return { ok: true, bookingId: inserted.id };
}
