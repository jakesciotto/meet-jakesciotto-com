"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addBlockedDate, removeBlockedDate } from "@/actions/availability";

export type BlockedDate = { date: string; note: string | null };

export function BlockedDatesEditor({ initial }: { initial: BlockedDate[] }) {
  const [dates, setDates] = useState<BlockedDate[]>(initial);
  const [newDate, setNewDate] = useState("");
  const [newNote, setNewNote] = useState("");
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);

  const add = () => {
    if (!newDate) return;
    setStatus(null);
    startTransition(async () => {
      try {
        await addBlockedDate({ date: newDate, note: newNote || undefined });
        setDates((d) =>
          [...d.filter((x) => x.date !== newDate), { date: newDate, note: newNote || null }].sort(
            (a, b) => a.date.localeCompare(b.date)
          )
        );
        setNewDate("");
        setNewNote("");
      } catch (e) {
        setStatus(e instanceof Error ? e.message : "Add failed");
      }
    });
  };

  const remove = (date: string) => {
    setStatus(null);
    startTransition(async () => {
      try {
        await removeBlockedDate(date);
        setDates((d) => d.filter((x) => x.date !== date));
      } catch (e) {
        setStatus(e instanceof Error ? e.message : "Remove failed");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-sm border border-primary/20 bg-card p-4">
        <div className="grid gap-3 sm:grid-cols-[160px_1fr_auto] sm:items-end">
          <div className="space-y-1">
            <Label htmlFor="blocked-date">Date</Label>
            <Input
              id="blocked-date"
              type="date"
              className="font-mono"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="blocked-note">Note (optional)</Label>
            <Input
              id="blocked-note"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="e.g. Vacation"
            />
          </div>
          <Button onClick={add} disabled={!newDate || pending}>
            {pending ? "Adding…" : "Block date"}
          </Button>
        </div>
        {status && <p className="mt-2 text-sm text-destructive">{status}</p>}
      </div>

      <ul className="divide-y rounded-sm border border-primary/20 bg-card">
        {dates.length === 0 && (
          <li className="px-4 py-3 text-sm text-muted-foreground">No blocked dates.</li>
        )}
        {dates.map((d) => (
          <li key={d.date} className="flex items-center justify-between px-4 py-3">
            <div>
              <span className="font-mono font-medium">{d.date}</span>
              {d.note && <span className="ml-3 text-sm text-muted-foreground">{d.note}</span>}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => remove(d.date)}
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
