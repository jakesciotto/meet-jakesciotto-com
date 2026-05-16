import { google, type calendar_v3 } from "googleapis";
import { requireEnv } from "./config";
import { serviceClient } from "./supabase";
import type { BusyRange } from "./slots";

export const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.freebusy",
];

export function getOAuthClient() {
  return new google.auth.OAuth2(
    requireEnv("GOOGLE_CLIENT_ID"),
    requireEnv("GOOGLE_CLIENT_SECRET"),
    requireEnv("GOOGLE_OAUTH_REDIRECT_URI")
  );
}

export function getAuthUrl(state: string): string {
  return getOAuthClient().generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GOOGLE_SCOPES,
    state,
  });
}

/** Exchange auth code -> tokens. Returns refresh_token and the verified email of the user who consented. */
export async function exchangeCode(code: string): Promise<{
  refreshToken: string;
  scopes: string;
  email: string;
}> {
  const client = getOAuthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error("No refresh token returned. Re-run consent with prompt=consent.");
  }
  client.setCredentials(tokens);
  const oauth2 = google.oauth2({ version: "v2", auth: client });
  const { data } = await oauth2.userinfo.get();
  if (!data.email) {
    throw new Error("Google did not return an email for the user.");
  }
  return {
    refreshToken: tokens.refresh_token,
    scopes: tokens.scope ?? GOOGLE_SCOPES.join(" "),
    email: data.email,
  };
}

/** Build an authenticated client using the stored admin refresh token. */
async function getAdminCalendarClient(): Promise<calendar_v3.Calendar> {
  const supabase = serviceClient();
  const { data, error } = await supabase
    .from("admin_google_oauth")
    .select("refresh_token")
    .single();

  if (error || !data) {
    throw new Error("Admin has not connected Google yet. Visit /admin/login.");
  }

  const client = getOAuthClient();
  client.setCredentials({ refresh_token: data.refresh_token });
  return google.calendar({ version: "v3", auth: client });
}

/** Query Google free/busy for the admin's primary calendar over a single date range. */
export async function getFreeBusy(timeMinIso: string, timeMaxIso: string): Promise<BusyRange[]> {
  const calendar = await getAdminCalendarClient();
  const { data } = await calendar.freebusy.query({
    requestBody: {
      timeMin: timeMinIso,
      timeMax: timeMaxIso,
      items: [{ id: "primary" }],
    },
  });
  const busy = data.calendars?.primary?.busy ?? [];
  return busy
    .filter((b): b is { start: string; end: string } => Boolean(b.start && b.end))
    .map((b) => ({ start: new Date(b.start), end: new Date(b.end) }));
}

export type InsertEventInput = {
  summary: string;
  description: string;
  startsAt: Date;
  endsAt: Date;
  attendeeEmail: string;
  attendeeName: string;
  conferencing: "meet" | "phone" | "other";
  invitee_phone?: string;
  meeting_link?: string;
};

export type InsertEventResult = {
  eventId: string;
  meetLink?: string;
};

export async function insertEvent(input: InsertEventInput): Promise<InsertEventResult> {
  const calendar = await getAdminCalendarClient();
  const requestId = crypto.randomUUID();

  let description = input.description;
  const requestBody: calendar_v3.Schema$Event = {
    summary: input.summary,
    start: { dateTime: input.startsAt.toISOString() },
    end: { dateTime: input.endsAt.toISOString() },
    attendees: [{ email: input.attendeeEmail, displayName: input.attendeeName }],
  };

  if (input.conferencing === "meet") {
    requestBody.conferenceData = {
      createRequest: {
        requestId,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    };
  } else if (input.conferencing === "phone") {
    requestBody.location = input.invitee_phone
      ? `Phone: ${input.invitee_phone}`
      : "Phone (number to be provided)";
  } else if (input.conferencing === "other" && input.meeting_link) {
    requestBody.location = input.meeting_link;
    description = `Join link: ${input.meeting_link}\n\n${description}`;
  }

  requestBody.description = description;

  const { data } = await calendar.events.insert({
    calendarId: "primary",
    requestBody,
    conferenceDataVersion: input.conferencing === "meet" ? 1 : 0,
    sendUpdates: "all",
  });

  if (!data.id) throw new Error("Google did not return an event ID.");
  const meetLink = data.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")
    ?.uri;
  return { eventId: data.id, meetLink: meetLink ?? undefined };
}

export async function deleteEvent(eventId: string): Promise<void> {
  const calendar = await getAdminCalendarClient();
  await calendar.events.delete({
    calendarId: "primary",
    eventId,
    sendUpdates: "all",
  });
}
