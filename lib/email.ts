import { Resend } from "resend";
import { config, requireEnv } from "./config";

export type BookingEmail = {
  bookingId: string;
  inviteeName: string;
  inviteeEmail: string;
  startsAt: Date;
  endsAt: Date;
  conferencing: "meet" | "phone";
  meetLink?: string;
  inviteePhone?: string;
};

function resend() {
  return new Resend(requireEnv("RESEND_API_KEY"));
}

function from() {
  return requireEnv("EMAIL_FROM");
}

function formatDateTime(date: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
    timeZone: tz,
  }).format(date);
}

export async function sendConfirmation(booking: BookingEmail): Promise<void> {
  const when = formatDateTime(booking.startsAt, config.hostTz);
  const cancelUrl = `${config.appUrl}/book/cancel/${booking.bookingId}`;
  const meetingDetails =
    booking.conferencing === "meet"
      ? booking.meetLink
        ? `Join via Google Meet: ${booking.meetLink}`
        : "A Google Meet link will be in your calendar invite."
      : `Jake will call you at ${booking.inviteePhone ?? "the number you provided"}.`;

  const text = [
    `Hi ${booking.inviteeName},`,
    "",
    `You're booked with Jake Sciotto for ${when}.`,
    "",
    meetingDetails,
    "",
    `Need to cancel? ${cancelUrl}`,
  ].join("\n");

  const html = `
    <p>Hi ${escapeHtml(booking.inviteeName)},</p>
    <p>You're booked with Jake Sciotto for <strong>${escapeHtml(when)}</strong>.</p>
    <p>${escapeHtml(meetingDetails)}</p>
    <p>Need to cancel? <a href="${cancelUrl}">${cancelUrl}</a></p>
  `;

  const ics = buildIcs(booking, "REQUEST");
  await resend().emails.send({
    from: from(),
    to: booking.inviteeEmail,
    subject: `Confirmed: meeting with Jake on ${when}`,
    text,
    html,
    attachments: [
      {
        filename: "invite.ics",
        content: Buffer.from(ics).toString("base64"),
        contentType: "text/calendar; method=REQUEST",
      },
    ],
  });
}

export async function sendCancellation(booking: BookingEmail): Promise<void> {
  const when = formatDateTime(booking.startsAt, config.hostTz);
  const rebookUrl = `${config.appUrl}/`;
  const text = [
    `Hi ${booking.inviteeName},`,
    "",
    `Your meeting with Jake on ${when} has been cancelled.`,
    "",
    `Want to rebook? ${rebookUrl}`,
  ].join("\n");
  const html = `
    <p>Hi ${escapeHtml(booking.inviteeName)},</p>
    <p>Your meeting with Jake on <strong>${escapeHtml(when)}</strong> has been cancelled.</p>
    <p>Want to rebook? <a href="${rebookUrl}">${rebookUrl}</a></p>
  `;
  await resend().emails.send({
    from: from(),
    to: booking.inviteeEmail,
    subject: `Cancelled: meeting with Jake on ${when}`,
    text,
    html,
  });
}

function buildIcs(booking: BookingEmail, method: "REQUEST" | "CANCEL"): string {
  const fmt = (d: Date) =>
    d
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
  const summary = "Meeting with Jake Sciotto";
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//meet.jakesciotto.com//Booking//EN",
    `METHOD:${method}`,
    "BEGIN:VEVENT",
    `UID:${booking.bookingId}@meet.jakesciotto.com`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(booking.startsAt)}`,
    `DTEND:${fmt(booking.endsAt)}`,
    `SUMMARY:${summary}`,
    `ORGANIZER:mailto:${config.adminEmail}`,
    `ATTENDEE;CN=${booking.inviteeName}:mailto:${booking.inviteeEmail}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}
