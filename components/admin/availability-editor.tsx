"use client";

import { useState, useTransition } from "react";
import { XIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { setWeekdayAvailability } from "@/actions/availability";

type Window = { startMinute: number; endMinute: number };
type RulesByWeekday = Record<number, Window[]>;

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function labelForMinute(m: number): string {
  const total = m % 1440;
  const h24 = Math.floor(total / 60);
  const min = total % 60;
  const period = h24 < 12 ? "AM" : "PM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${min.toString().padStart(2, "0")} ${period}`;
}

const START_OPTIONS = Array.from({ length: 48 }, (_, i) => i * 30); // 0:00..23:30
const END_OPTIONS = Array.from({ length: 48 }, (_, i) => (i + 1) * 30); // 0:30..24:00

function withValue(options: number[], value: number): number[] {
  return options.includes(value)
    ? options
    : [...options, value].sort((a, b) => a - b);
}

function TimeSelect({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: number;
  options: number[];
  onChange: (m: number) => void;
  ariaLabel: string;
}) {
  return (
    <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
      <SelectTrigger aria-label={ariaLabel} className="w-36">
        <SelectValue>{labelForMinute(value)}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {withValue(options, value).map((m) => (
          <SelectItem key={m} value={String(m)}>
            {labelForMinute(m)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function AvailabilityEditor({ initial }: { initial: RulesByWeekday }) {
  return (
    <div className="space-y-3">
      {WEEKDAYS.map((name, weekday) => (
        <WeekdayRow
          key={weekday}
          weekday={weekday}
          name={name}
          initialWindows={initial[weekday] ?? []}
        />
      ))}
    </div>
  );
}

function WeekdayRow({
  weekday,
  name,
  initialWindows,
}: {
  weekday: number;
  name: string;
  initialWindows: Window[];
}) {
  const [windows, setWindows] = useState<Window[]>(initialWindows);
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);

  const update = (i: number, patch: Partial<Window>) => {
    setStatus(null);
    setWindows((ws) => ws.map((w, idx) => (idx === i ? { ...w, ...patch } : w)));
  };
  const add = () => {
    setStatus(null);
    setWindows((ws) => [...ws, { startMinute: 9 * 60, endMinute: 17 * 60 }]);
  };
  const remove = (i: number) => {
    setStatus(null);
    setWindows((ws) => ws.filter((_, idx) => idx !== i));
  };

  const save = () => {
    setStatus(null);
    startTransition(async () => {
      try {
        await setWeekdayAvailability({ weekday, windows });
        setStatus("Saved");
      } catch (e) {
        setStatus(e instanceof Error ? e.message : "Save failed");
      }
    });
  };

  return (
    <div className="rounded-sm border border-primary/20 bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-medium">{name}</h3>
        <div className="flex items-center gap-2 text-sm">
          {status && (
            <span className={status === "Saved" ? "text-signal" : "text-destructive"}>
              {status}
            </span>
          )}
          <Button type="button" variant="outline" size="sm" onClick={add}>
            <PlusIcon className="mr-1 size-3.5" />
            Add window
          </Button>
          <Button type="button" size="sm" onClick={save} disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      {windows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No availability on this day.</p>
      ) : (
        <div className="space-y-2">
          {windows.map((w, i) => (
            <div key={i} className="flex items-center gap-2">
              <TimeSelect
                ariaLabel="Start time"
                value={w.startMinute}
                options={START_OPTIONS}
                onChange={(m) => update(i, { startMinute: m })}
              />
              <span aria-hidden className="text-muted-foreground">
                —
              </span>
              <TimeSelect
                ariaLabel="End time"
                value={w.endMinute}
                options={END_OPTIONS}
                onChange={(m) => update(i, { endMinute: m })}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Remove window"
                className="ml-1 size-8 text-muted-foreground hover:text-destructive"
                onClick={() => remove(i)}
              >
                <XIcon className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
