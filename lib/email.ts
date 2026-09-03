import { config } from "./config";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export type HostNotice = {
  bookingId: string;
  inviteeName: string;
  inviteeCompany: string;
  inviteeEmail: string;
  startsAt: Date;
  endsAt: Date;
  conferencing: "meet" | "phone" | "other";
  inviteePhone?: string;
  meetingLink?: string;
  notes?: string;
};

export type SendResult = { sent: boolean; reason?: string };

export async function sendHostBookingNotice(notice: HostNotice): Promise<SendResult> {
  const when = formatWhen(notice.startsAt);
  return send({
    subject: `New booking: ${notice.inviteeName} (${notice.inviteeCompany}) on ${when}`,
    replyTo: notice.inviteeEmail,
    lines: [
      `${notice.inviteeName} booked ${when}.`,
      "",
      ...detailLines(notice),
    ],
  });
}

export async function sendHostCancellationNotice(notice: HostNotice): Promise<SendResult> {
  const when = formatWhen(notice.startsAt);
  return send({
    subject: `Cancelled: ${notice.inviteeName} (${notice.inviteeCompany}) on ${when}`,
    replyTo: notice.inviteeEmail,
    lines: [
      `${notice.inviteeName} cancelled ${when}.`,
      "",
      `Company: ${notice.inviteeCompany}`,
      `Email: ${notice.inviteeEmail}`,
      "",
      "The slot is open again.",
    ],
  });
}

function detailLines(notice: HostNotice): string[] {
  const lines = [
    `Company: ${notice.inviteeCompany}`,
    `Email: ${notice.inviteeEmail}`,
    `Length: ${minutesBetween(notice.startsAt, notice.endsAt)} minutes`,
    `How: ${describeConferencing(notice)}`,
  ];
  if (notice.notes) lines.push("", "Notes:", notice.notes);
  lines.push("", `Admin: ${config.appUrl}/admin`);
  return lines;
}

function describeConferencing(notice: HostNotice): string {
  if (notice.conferencing === "phone") {
    return `Phone call to ${notice.inviteePhone ?? "a number they did not give"}`;
  }
  if (notice.conferencing === "other") {
    return `Their link: ${notice.meetingLink ?? "not provided"}`;
  }
  return "Google Meet (link is in the calendar invite)";
}

function minutesBetween(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 60_000);
}

function formatWhen(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
    timeZone: config.hostTz,
  }).format(date);
}

async function send(message: {
  subject: string;
  replyTo: string;
  lines: string[];
}): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    console.warn("Host notice skipped: set RESEND_API_KEY and EMAIL_FROM to enable it.");
    return { sent: false, reason: "not_configured" };
  }

  const text = message.lines.join("\n");
  const html = message.lines
    .map((line) => (line ? `<p>${escapeHtml(line)}</p>` : ""))
    .join("");

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [config.notifyEmail],
        reply_to: [message.replyTo],
        subject: message.subject,
        text,
        html,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      const reason = `Resend responded ${response.status}: ${detail}`;
      console.error("Host notice failed", reason);
      return { sent: false, reason };
    }
    return { sent: true };
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    console.error("Host notice failed", reason);
    return { sent: false, reason };
  }
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
