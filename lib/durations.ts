export const MEETING_DURATIONS = [15, 30, 45, 60] as const;

export type MeetingDuration = (typeof MEETING_DURATIONS)[number];

export const DEFAULT_DURATION: MeetingDuration = 30;

export function isMeetingDuration(value: number): value is MeetingDuration {
  return (MEETING_DURATIONS as readonly number[]).includes(value);
}

/** Reads a URL or form value. Returns null unless it names an offered length exactly. */
export function parseDuration(raw: string | null | undefined): MeetingDuration | null {
  if (raw == null || !/^\d+$/.test(raw)) return null;
  const value = Number(raw);
  return isMeetingDuration(value) ? value : null;
}

/** Start times step every 30 minutes, or every 15 for a 15 minute meeting. */
export function slotAlignmentFor(duration: MeetingDuration): number {
  return Math.min(duration, 30);
}
