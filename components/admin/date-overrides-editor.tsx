"use client";

import { useMemo, useState, useTransition } from "react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { CalendarIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  DEFAULT_WINDOW,
  WindowRows,
  labelForWindow,
  type Window,
} from "@/components/admin/time-select";
import {
  addBlockedDates,
  addOpenDates,
  removeBlockedDates,
  removeOpenDates,
} from "@/actions/availability";
import { addDays, eachDay, parseIsoDate, toIsoDate } from "@/lib/dates";

export type BlockedDate = { date: string; note: string | null };
export type OpenDate = { date: string; windows: Window[]; note: string | null };

type Mode = "blocked" | "open";

type Override = {
  kind: Mode;
  date: string;
  windows: Window[];
  note: string | null;
};

type Run = {
  kind: Mode;
  start: string;
  end: string;
  note: string | null;
  windows: Window[];
  days: string[];
};

function signature(o: Override): string {
  const windows = o.windows.map((w) => `${w.startMinute}-${w.endMinute}`).join(",");
  return `${o.kind}|${windows}|${o.note ?? ""}`;
}

function groupRuns(overrides: Override[]): Run[] {
  const sorted = [...overrides].sort((a, b) => a.date.localeCompare(b.date));
  const runs: (Run & { sig: string })[] = [];
  for (const o of sorted) {
    const sig = signature(o);
    const last = runs[runs.length - 1];
    if (last && last.sig === sig && addDays(last.end, 1) === o.date) {
      last.end = o.date;
      last.days.push(o.date);
    } else {
      runs.push({
        sig,
        kind: o.kind,
        start: o.date,
        end: o.date,
        note: o.note,
        windows: o.windows,
        days: [o.date],
      });
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
  return `${left} to ${format(to, "MMM d, yyyy")}`;
}

function validateWindows(windows: Window[]): string | null {
  if (windows.length === 0) return "Add at least one window.";
  if (windows.some((w) => w.endMinute <= w.startMinute)) {
    return "Each window must end after it starts.";
  }
  if (new Set(windows.map((w) => w.startMinute)).size !== windows.length) {
    return "Windows must not share a start time.";
  }
  return null;
}

function sortWindows(windows: Window[]): Window[] {
  return [...windows].sort((a, b) => a.startMinute - b.startMinute);
}

export function DateOverridesEditor({
  blocked: initialBlocked,
  open: initialOpen,
}: {
  blocked: BlockedDate[];
  open: OpenDate[];
}) {
  const [blocked, setBlocked] = useState<BlockedDate[]>(initialBlocked);
  const [open, setOpen] = useState<OpenDate[]>(initialOpen);
  const [range, setRange] = useState<DateRange | undefined>();
  const [mode, setMode] = useState<Mode>("blocked");
  const [windows, setWindows] = useState<Window[]>([DEFAULT_WINDOW]);
  const [note, setNote] = useState("");
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);

  const runs = useMemo(() => {
    const overrides: Override[] = [
      ...blocked.map((b) => ({ kind: "blocked" as const, date: b.date, windows: [], note: b.note })),
      ...open.map((o) => ({ kind: "open" as const, date: o.date, windows: o.windows, note: o.note })),
    ];
    return groupRuns(overrides);
  }, [blocked, open]);

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
      ? `${format(range.from, "MMM d")} to ${format(range.to, "MMM d, yyyy")}`
      : format(range.from, "EEE, MMM d, yyyy");

  const applyBlocked = (dates: string[], n: string | null) => {
    const touched = new Set(dates);
    setOpen((o) => o.filter((x) => !touched.has(x.date)));
    setBlocked((b) => {
      const next = new Map(b.map((x) => [x.date, x] as const));
      for (const date of dates) next.set(date, { date, note: n });
      return [...next.values()].sort((a, c) => a.date.localeCompare(c.date));
    });
  };

  const applyOpen = (dates: string[], ws: Window[], n: string | null) => {
    const touched = new Set(dates);
    setBlocked((b) => b.filter((x) => !touched.has(x.date)));
    setOpen((o) => {
      const next = new Map(o.map((x) => [x.date, x] as const));
      for (const date of dates) next.set(date, { date, windows: ws, note: n });
      return [...next.values()].sort((a, c) => a.date.localeCompare(c.date));
    });
  };

  const submit = () => {
    if (selectedDays.length === 0) return;
    const sorted = sortWindows(windows);
    if (mode === "open") {
      const problem = validateWindows(sorted);
      if (problem) {
        setStatus(problem);
        return;
      }
    }
    setStatus(null);
    const n = note || null;
    startTransition(async () => {
      try {
        if (mode === "blocked") {
          await addBlockedDates({ dates: selectedDays, note: note || undefined });
          applyBlocked(selectedDays, n);
        } else {
          await addOpenDates({ dates: selectedDays, windows: sorted, note: note || undefined });
          applyOpen(selectedDays, sorted, n);
        }
        setRange(undefined);
        setNote("");
      } catch (e) {
        setStatus(e instanceof Error ? e.message : "Save failed");
      }
    });
  };

  const remove = (run: Run) => {
    setStatus(null);
    startTransition(async () => {
      try {
        const removing = new Set(run.days);
        if (run.kind === "blocked") {
          await removeBlockedDates({ dates: run.days });
          setBlocked((b) => b.filter((x) => !removing.has(x.date)));
        } else {
          await removeOpenDates({ dates: run.days });
          setOpen((o) => o.filter((x) => !removing.has(x.date)));
        }
      } catch (e) {
        setStatus(e instanceof Error ? e.message : "Remove failed");
      }
    });
  };

  const submitLabel = pending
    ? "Saving…"
    : mode === "blocked"
      ? selectedDays.length > 1
        ? "Block dates"
        : "Block date"
      : selectedDays.length > 1
        ? "Open dates"
        : "Open date";

  return (
    <div className="space-y-4">
      <div className="space-y-4 rounded-sm border border-primary/20 bg-card p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Date or range</Label>
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
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
            <Label htmlFor="override-note">Note (optional)</Label>
            <Input
              id="override-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={mode === "blocked" ? "e.g. Vacation" : "e.g. Conference week"}
            />
          </div>
        </div>

        <RadioGroup
          value={mode}
          onValueChange={(v) => {
            setStatus(null);
            setMode(v as Mode);
          }}
          className="flex flex-wrap gap-x-6 gap-y-2"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="blocked" id="override-mode-blocked" />
            <Label htmlFor="override-mode-blocked">Block the day</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="open" id="override-mode-open" />
            <Label htmlFor="override-mode-open">Open with hours</Label>
          </div>
        </RadioGroup>

        {mode === "open" && (
          <div className="space-y-2">
            <WindowRows
              windows={windows}
              onChange={(next) => {
                setStatus(null);
                setWindows(next);
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setWindows((ws) => [...ws, DEFAULT_WINDOW])}
            >
              <PlusIcon className="mr-1 size-3.5" />
              Add window
            </Button>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 text-sm">
          {status && <span className="text-destructive">{status}</span>}
          <Button onClick={submit} disabled={selectedDays.length === 0 || pending}>
            {submitLabel}
          </Button>
        </div>
      </div>

      <ul className="divide-y divide-primary/10 rounded-sm border border-primary/20 bg-card">
        {runs.length === 0 && (
          <li className="px-4 py-3 text-sm text-muted-foreground">No date overrides.</li>
        )}
        {runs.map((run) => (
          <li
            key={`${run.kind}-${run.start}`}
            className="flex items-center justify-between gap-3 px-4 py-3"
          >
            <div className="min-w-0 space-y-0.5">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-medium">{formatRun(run)}</span>
                {run.days.length > 1 && (
                  <span className="text-xs text-muted-foreground">({run.days.length} days)</span>
                )}
                {run.note && (
                  <span className="truncate text-sm text-muted-foreground">{run.note}</span>
                )}
              </div>
              <div className="text-xs">
                {run.kind === "blocked" ? (
                  <span className="text-muted-foreground">Blocked</span>
                ) : (
                  <span className="text-signal">
                    Open {run.windows.map(labelForWindow).join(", ")}
                  </span>
                )}
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => remove(run)} disabled={pending}>
              Remove
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
