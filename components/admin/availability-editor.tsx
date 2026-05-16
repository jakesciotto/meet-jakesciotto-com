"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setWeekdayAvailability } from "@/actions/availability";

type Window = { startMinute: number; endMinute: number };
type RulesByWeekday = Record<number, Window[]>;

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function minutesToTime(m: number): string {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${h.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function AvailabilityEditor({ initial }: { initial: RulesByWeekday }) {
  return (
    <div className="space-y-4">
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
    setWindows((ws) =>
      ws.map((w, idx) => (idx === i ? { ...w, ...patch } : w)),
    );
  };
  const add = () =>
    setWindows((ws) => [...ws, { startMinute: 9 * 60, endMinute: 17 * 60 }]);
  const remove = (i: number) =>
    setWindows((ws) => ws.filter((_, idx) => idx !== i));

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
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-medium">{name}</h3>
        <div className="flex items-center gap-2 text-sm">
          {status && <span className="text-muted-foreground">{status}</span>}
          <Button type="button" variant="outline" size="sm" onClick={add}>
            Add window
          </Button>
          <Button type="button" size="sm" onClick={save} disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      {windows.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No availability on this day.
        </p>
      )}

      <div className="space-y-2">
        {windows.map((w, i) => (
          <div key={i} className="flex items-center gap-2">
            <Label className="sr-only">Start</Label>
            <Input
              type="time"
              value={minutesToTime(w.startMinute)}
              onChange={(e) =>
                update(i, { startMinute: timeToMinutes(e.target.value) })
              }
              className="w-32"
            />
            <span aria-hidden>—</span>
            <Label className="sr-only">End</Label>
            <Input
              type="time"
              value={minutesToTime(w.endMinute)}
              onChange={(e) =>
                update(i, { endMinute: timeToMinutes(e.target.value) })
              }
              className="w-32"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => remove(i)}
            >
              Remove
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
