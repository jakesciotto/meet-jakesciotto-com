"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Calendar } from "@/components/ui/calendar";

export type DatePickerProps = {
  /** ISO dates (YYYY-MM-DD in host TZ) that should be disabled (blocked + no-rules days). */
  disabledDates: string[];
  /** Date string YYYY-MM-DD; first selectable day (host TZ "today"). */
  fromDate: string;
  /** Date string YYYY-MM-DD; last selectable day (host TZ today + horizon). */
  toDate: string;
};

export function DatePicker({
  disabledDates,
  fromDate,
  toDate,
}: DatePickerProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const disabledSet = new Set(disabledDates);

  const select = (date: Date | undefined) => {
    if (!date) return;
    const iso = toIsoDate(date);
    if (disabledSet.has(iso)) return;
    startTransition(() => {
      router.push(`/book/${iso}`);
    });
  };

  return (
    <div
      aria-busy={pending}
      className="rounded-xl border bg-card p-2 shadow-sm sm:p-3"
    >
      <Calendar
        mode="single"
        onSelect={select}
        disabled={[
          { before: parseIsoDate(fromDate) },
          { after: parseIsoDate(toDate) },
          (date) => disabledSet.has(toIsoDate(date)),
        ]}
        showOutsideDays={false}
        className="mx-auto rounded-lg bg-transparent [&_button]:text-base [&_button]:font-normal [--cal-day-text:1.1rem] [--cal-weekday-text:1rem] [--cal-caption-text:1.2rem]"
      />
    </div>
  );
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseIsoDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
