"use client";

import { useVisitorTz } from "@/lib/visitor-tz";
import { formatMeetingWhen, formatSlotTime } from "@/lib/when";

type Props = {
  iso: string;
  hostTz: string;
  format: "slot" | "when";
  slotDate?: string;
  lowercase?: boolean;
};

export function LocalTime({ iso, hostTz, format, slotDate, lowercase }: Props) {
  const tz = useVisitorTz(hostTz);
  const date = new Date(iso);
  const text =
    format === "slot" ? formatSlotTime(date, tz, slotDate) : formatMeetingWhen(date, tz);
  return <>{lowercase ? text.toLowerCase() : text}</>;
}
