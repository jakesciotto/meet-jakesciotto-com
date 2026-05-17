"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { computeSlots, type AvailabilityRule, type Slot } from "@/lib/slots";
import { weekdayOf } from "@/lib/dates";

type SerializedBusyRange = { start: string; end: string };

type SlotConfig = {
  slotMinutes: number;
  slotAlignmentMinutes: number;
  minNoticeHours: number;
  hostTz: string;
};

export type BookingPickerProps = {
  disabledDates: string[];
  fromDate: string;
  toDate: string;
  rulesByWeekday: Record<number, AvailabilityRule[]>;
  bookings: SerializedBusyRange[];
  busyRanges: SerializedBusyRange[];
  slotConfig: SlotConfig;
};

export function BookingPicker({
  disabledDates,
  fromDate,
  toDate,
  rulesByWeekday,
  bookings,
  busyRanges,
  slotConfig,
}: BookingPickerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const disabledSet = useMemo(() => new Set(disabledDates), [disabledDates]);
  const [selectedDate, setSelectedDate] = useState<string | null>(() => {
    const d = searchParams.get("date");
    if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
    if (d < fromDate || d > toDate) return null;
    if (disabledDates.includes(d)) return null;
    return d;
  });
  const [viewMonth, setViewMonth] = useState<Date>(() =>
    parseIsoDate(selectedDate ?? fromDate),
  );

  const parsedBusy = useMemo(
    () => busyRanges.map(deserializeRange),
    [busyRanges],
  );
  const parsedBookings = useMemo(
    () => bookings.map(deserializeRange),
    [bookings],
  );

  // Frozen at first render; sufficient for the 24h minNotice gate.
  const now = useMemo(() => new Date(), []);

  const slots = useMemo<Slot[]>(() => {
    if (!selectedDate) return [];
    const rules = rulesByWeekday[weekdayOf(selectedDate)] ?? [];
    return computeSlots({
      date: selectedDate,
      rules,
      busyRanges: parsedBusy,
      bookings: parsedBookings,
      now,
      config: slotConfig,
    });
  }, [
    selectedDate,
    rulesByWeekday,
    parsedBusy,
    parsedBookings,
    now,
    slotConfig,
  ]);

  const onDateSelect = (date: Date | undefined) => {
    if (!date) return;
    const iso = toIsoDate(date);
    if (disabledSet.has(iso)) return;
    setSelectedDate(iso);
    setViewMonth(date);
  };

  const onClearDate = () => {
    setSelectedDate(null);
    if (searchParams.get("date")) {
      router.replace("/", { scroll: false });
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border/60 bg-card p-2 sm:p-3">
        <Calendar
          mode="single"
          onSelect={onDateSelect}
          selected={selectedDate ? parseIsoDate(selectedDate) : undefined}
          month={viewMonth}
          onMonthChange={setViewMonth}
          disabled={[
            { before: parseIsoDate(fromDate) },
            { after: parseIsoDate(toDate) },
            (date) => disabledSet.has(toIsoDate(date)),
          ]}
          showOutsideDays={false}
          className="mx-auto rounded-lg bg-transparent [&_button]:text-base [&_button]:font-normal [--cal-day-text:1.1rem] [--cal-weekday-text:1rem] [--cal-caption-text:1.2rem]"
        />
      </div>
      {selectedDate && (
        <div key={selectedDate} className="anim-in-fade-up space-y-3">
          <div className="flex items-baseline justify-between gap-3 border-b border-border/50 pb-2">
            <h2 className="text-lg font-medium tracking-tight">
              {formatDateHeader(selectedDate)}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearDate}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </Button>
          </div>
          <SlotPanel
            date={selectedDate}
            slots={slots}
            hostTz={slotConfig.hostTz}
          />
        </div>
      )}
    </div>
  );
}

function formatDateHeader(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

function SlotPanel({
  date,
  slots,
  hostTz,
}: {
  date: string;
  slots: Slot[];
  hostTz: string;
}) {
  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: hostTz,
      }),
    [hostTz],
  );

  if (slots.length === 0) {
    return (
      <p className="anim-in-fade rounded-lg border bg-card p-4 text-sm text-muted-foreground">
        No times available on this day. Try another date.
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {slots.map((s, i) => {
        const iso = s.startsAt.toISOString();
        const delay = Math.min(i * 20, 200);
        return (
          <li
            key={iso}
            className="anim-in-fade-up"
            style={{ animationDelay: `${delay}ms` }}
          >
            <Button
              asChild
              variant="outline"
              className="h-12 w-full justify-center font-mono text-base tracking-tight transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-sm"
            >
              <Link
                href={{
                  pathname: "/book/confirm",
                  query: { date, start: iso },
                }}
                prefetch
              >
                {formatter.format(s.startsAt)}
              </Link>
            </Button>
          </li>
        );
      })}
    </ul>
  );
}

function deserializeRange(r: SerializedBusyRange) {
  return { start: new Date(r.start), end: new Date(r.end) };
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
