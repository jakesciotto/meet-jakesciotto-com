"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateSettings, type SettingsInput } from "@/actions/availability";
import type { Settings } from "@/lib/settings";

function parseForm(fields: {
  maxPerDay: string;
  minNotice: string;
  horizon: string;
}): SettingsInput | string {
  const cap = fields.maxPerDay.trim() === "" ? null : Number(fields.maxPerDay);
  const notice = Number(fields.minNotice);
  const days = Number(fields.horizon);
  if (cap !== null && (!Number.isInteger(cap) || cap < 1)) {
    return "Max meetings per day must be a whole number of 1 or more, or blank for no limit.";
  }
  if (!Number.isInteger(notice) || notice < 0) {
    return "Minimum notice must be a whole number of hours, 0 or more.";
  }
  if (!Number.isInteger(days) || days < 1 || days > 365) {
    return "Booking horizon must be between 1 and 365 days.";
  }
  return { maxBookingsPerDay: cap, minNoticeHours: notice, horizonDays: days };
}

export function SettingsEditor({ initial }: { initial: Settings }) {
  const [maxPerDay, setMaxPerDay] = useState(initial.maxBookingsPerDay?.toString() ?? "");
  const [minNotice, setMinNotice] = useState(String(initial.minNoticeHours));
  const [horizon, setHorizon] = useState(String(initial.horizonDays));
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);

  const save = () => {
    const input = parseForm({ maxPerDay, minNotice, horizon });
    if (typeof input === "string") {
      setStatus(input);
      return;
    }
    setStatus(null);
    startTransition(async () => {
      try {
        await updateSettings(input);
        setStatus("Saved");
      } catch (e) {
        setStatus(e instanceof Error ? e.message : "Save failed");
      }
    });
  };

  return (
    <div className="rounded-sm border border-primary/20 bg-card p-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="settings-max-per-day">Max meetings per day</Label>
          <Input
            id="settings-max-per-day"
            type="number"
            inputMode="numeric"
            min={1}
            placeholder="No limit"
            value={maxPerDay}
            onChange={(e) => setMaxPerDay(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Blank means no limit. Counts bookings made here, not other calendar events.
          </p>
        </div>
        <div className="space-y-1">
          <Label htmlFor="settings-min-notice">Minimum notice (hours)</Label>
          <Input
            id="settings-min-notice"
            type="number"
            inputMode="numeric"
            min={0}
            value={minNotice}
            onChange={(e) => setMinNotice(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Earliest a slot can start, measured from now.
          </p>
        </div>
        <div className="space-y-1">
          <Label htmlFor="settings-horizon">Booking horizon (days)</Label>
          <Input
            id="settings-horizon"
            type="number"
            inputMode="numeric"
            min={1}
            max={365}
            value={horizon}
            onChange={(e) => setHorizon(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">How far ahead the calendar opens.</p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-end gap-3 text-sm">
        {status && (
          <span className={status === "Saved" ? "text-signal" : "text-destructive"}>
            {status}
          </span>
        )}
        <Button type="button" size="sm" onClick={save} disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}
