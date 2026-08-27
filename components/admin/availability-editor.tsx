"use client";

import { useState, useTransition } from "react";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEFAULT_WINDOW, WindowRows, type Window } from "@/components/admin/time-select";
import { setWeekdayAvailability } from "@/actions/availability";

type RulesByWeekday = Record<number, Window[]>;

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

  const change = (next: Window[]) => {
    setStatus(null);
    setWindows(next);
  };
  const add = () => change([...windows, DEFAULT_WINDOW]);

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
        <WindowRows windows={windows} onChange={change} />
      )}
    </div>
  );
}
