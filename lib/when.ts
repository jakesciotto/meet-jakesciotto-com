const LOCALE = "en-US";

export function formatSlotTime(date: Date, tz: string, slotDate?: string): string {
  const time = new Intl.DateTimeFormat(LOCALE, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: tz,
  }).format(date);
  if (slotDate && isoDateIn(date, tz) !== slotDate) {
    const weekday = new Intl.DateTimeFormat(LOCALE, { weekday: "short", timeZone: tz }).format(date);
    return `${weekday} ${time}`;
  }
  return time;
}

export function formatMeetingWhen(date: Date, tz: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
    timeZone: tz,
  }).format(date);
}

export function tzLabel(tz: string): string {
  return tz.replace(/_/g, " ");
}

export function isoDateIn(date: Date, tz: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: tz,
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
