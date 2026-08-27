"use client";

import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

export type Window = { startMinute: number; endMinute: number };

export const DEFAULT_WINDOW: Window = { startMinute: 9 * 60, endMinute: 17 * 60 };

export function labelForMinute(m: number): string {
  const total = m % 1440;
  const h24 = Math.floor(total / 60);
  const min = total % 60;
  const period = h24 < 12 ? "AM" : "PM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${min.toString().padStart(2, "0")} ${period}`;
}

export function labelForWindow(w: Window): string {
  return `${labelForMinute(w.startMinute)} to ${labelForMinute(w.endMinute)}`;
}

const START_OPTIONS = Array.from({ length: 48 }, (_, i) => i * 30); // 0:00..23:30
const END_OPTIONS = Array.from({ length: 48 }, (_, i) => (i + 1) * 30); // 0:30..24:00

function withValue(options: number[], value: number): number[] {
  return options.includes(value)
    ? options
    : [...options, value].sort((a, b) => a - b);
}

export function TimeSelect({
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

export function WindowRows({
  windows,
  onChange,
}: {
  windows: Window[];
  onChange: (next: Window[]) => void;
}) {
  const update = (i: number, patch: Partial<Window>) =>
    onChange(windows.map((w, idx) => (idx === i ? { ...w, ...patch } : w)));
  const remove = (i: number) => onChange(windows.filter((_, idx) => idx !== i));

  return (
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
            to
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
  );
}
