"use client";

import { useMemo, useState, useTransition } from "react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { addBlockedDates, removeBlockedDates } from "@/actions/availability";
import { addDays, eachDay, parseIsoDate, toIsoDate } from "@/lib/dates";

export type BlockedDate = { date: string; note: string | null };

type Run = { start: string; end: string; note: string | null; days: string[] };

function groupRuns(dates: BlockedDate[]): Run[] {
  const sorted = [...dates].sort((a, b) => a.date.localeCompare(b.date));
  const runs: Run[] = [];
  for (const { date, note } of sorted) {
    const last = runs[runs.length - 1];
    if (last && last.note === note && addDays(last.end, 1) === date) {
      last.end = date;
      last.days.push(date);
    } else {
      runs.push({ start: date, end: date, note, days: [date] });
    }
  }
  return runs;
}

function formatRun(run: Run): string {
  const from = parseIsoDate(run.start);
  const to = parseIsoDate(run.end);
  if (run.start === run.end) return format(from, "EEE, MMM d, yyyy");
  const sameYear = from.getFullYear() === to.getFullYear();
  const left = format(from, sameYear ? "MMM d" : "MMM d, yyyy");
  return `${left} – ${format(to, "MMM d, yyyy")}`;
}

export function BlockedDatesEditor({ initial }: { initial: BlockedDate[] }) {
  const [dates, setDates] = useState<BlockedDate[]>(initial);
  const [range, setRange] = useState<DateRange | undefined>();
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);

  const runs = useMemo(() => groupRuns(dates), [dates]);
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const selectedDays =
    range?.from && range?.to
      ? eachDay(toIsoDate(range.from), toIsoDate(range.to))
      : range?.from
        ? [toIsoDate(range.from)]
        : [];

  const triggerLabel = !range?.from
    ? "Pick dates"
    : range.to && range.to.getTime() !== range.from.getTime()
      ? `${format(range.from, "MMM d")} – ${format(range.to, "MMM d, yyyy")}`
      : format(range.from, "EEE, MMM d, yyyy");

  const add = () => {
    if (selectedDays.length === 0) return;
    setStatus(null);
    startTransition(async () => {
      try {
        await addBlockedDates({ dates: selectedDays, note: note || undefined });
        setDates((d) => {
          const next = new Map(d.map((x) => [x.date, x] as const));
          for (const date of selectedDays) next.set(date, { date, note: note || null });
          return [...next.values()].sort((a, b) => a.date.localeCompare(b.date));
        });
        setRange(undefined);
        setNote("");
      } catch (e) {
        setStatus(e instanceof Error ? e.message : "Block failed");
      }
    });
  };

  const remove = (days: string[]) => {
    setStatus(null);
    startTransition(async () => {
      try {
        await removeBlockedDates({ dates: days });
        const removing = new Set(days);
        setDates((d) => d.filter((x) => !removing.has(x.date)));
      } catch (e) {
        setStatus(e instanceof Error ? e.message : "Remove failed");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-sm border border-primary/20 bg-card p-4">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
          <div className="space-y-1">
            <Label>Date or range</Label>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="h-11 w-full justify-start font-normal data-[empty=true]:text-muted-foreground"
                  data-empty={!range?.from}
                >
                  <CalendarIcon className="mr-2 size-4 opacity-70" />
                  {triggerLabel}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-2" align="start">
                <Calendar
                  mode="range"
                  selected={range}
                  onSelect={setRange}
                  defaultMonth={range?.from}
                  numberOfMonths={1}
                  disabled={{ before: today }}
                  showOutsideDays={false}
                  autoFocus
                />
                <div className="flex items-center justify-between border-t border-primary/15 px-2 pt-2">
                  <span className="text-xs text-muted-foreground">
                    {selectedDays.length === 0
                      ? "Select a day or drag a range"
                      : `${selectedDays.length} day${selectedDays.length > 1 ? "s" : ""} selected`}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setRange(undefined)}
                    disabled={!range?.from}
                  >
                    Clear
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-1">
            <Label htmlFor="blocked-note">Note (optional)</Label>
            <Input
              id="blocked-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Vacation"
            />
          </div>
          <Button onClick={add} disabled={selectedDays.length === 0 || pending}>
            {pending ? "Blocking…" : "Block date"}
          </Button>
        </div>
        {status && <p className="mt-2 text-sm text-destructive">{status}</p>}
      </div>

      <ul className="divide-y divide-primary/10 rounded-sm border border-primary/20 bg-card">
        {runs.length === 0 && (
          <li className="px-4 py-3 text-sm text-muted-foreground">No blocked dates.</li>
        )}
        {runs.map((run) => (
          <li key={run.start} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <span className="font-medium">{formatRun(run)}</span>
              {run.days.length > 1 && (
                <span className="ml-2 text-xs text-muted-foreground">
                  ({run.days.length} days)
                </span>
              )}
              {run.note && (
                <span className="ml-3 truncate text-sm text-muted-foreground">{run.note}</span>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => remove(run.days)}
              disabled={pending}
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
