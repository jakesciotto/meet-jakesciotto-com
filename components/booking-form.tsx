"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { createBooking } from "@/actions/create-booking";

type Conferencing = "meet" | "phone" | "other";

function isLikelyEmail(s: string): boolean {
  if (s.length < 3 || s.length > 200) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function isLikelyUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function BookingForm({
  date,
  startIso,
}: {
  date: string;
  startIso: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [conferencing, setConferencing] = useState<Conferencing>("meet");
  const [pieCharts, setPieCharts] = useState<"yes" | "no" | null>(null);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const data = new FormData(e.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const company = String(data.get("company") ?? "").trim();
    const email = String(data.get("email") ?? "")
      .trim()
      .toLowerCase();
    const phone =
      conferencing === "phone"
        ? String(data.get("phone") ?? "").trim()
        : undefined;
    const meetingLink =
      conferencing === "other"
        ? String(data.get("meetingLink") ?? "").trim()
        : undefined;
    const baseNotes = String(data.get("notes") ?? "").trim();
    const pieChartsLine =
      pieCharts === "yes"
        ? "p.s. thinks pie charts are good"
        : pieCharts === "no"
          ? "p.s. thinks pie charts are bad"
          : null;
    const notes =
      [baseNotes || null, pieChartsLine].filter(Boolean).join("\n\n") ||
      undefined;

    if (!name) return setError("i have to know who you are");
    if (!company) return setError("i need to know who you're working for");
    if (!isLikelyEmail(email))
      return setError("hmmmm that doesn't look like a valid email address");
    if (conferencing === "phone" && !phone) {
      return setError(
        "well if you don't enter a number i won't be able to call you so",
      );
    }
    if (conferencing === "other") {
      if (!meetingLink)
        return setError(
          "okay well if you choose that option you need to paste a link",
        );
      if (!isLikelyUrl(meetingLink))
        return setError("paste an actual link please");
    }

    const input = {
      date,
      startIso,
      name,
      company,
      email,
      conferencing,
      phone,
      meetingLink,
      notes,
    };

    startTransition(async () => {
      const result = await createBooking(input);
      if (result.ok) {
        router.push(`/book/success/${result.bookingId}`);
      } else if (result.error === "slot_taken") {
        router.push(`/book/${date}?taken=1`);
      } else {
        setError(result.message);
      }
    });
  };

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {error && (
        <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500">
          <Alert variant="destructive">
            <AlertTitle>we couldn&rsquo;t book that</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      <div className="space-y-3">
        <Label className="pl-1" htmlFor="name">
          your name
        </Label>
        <Input id="name" name="name" autoComplete="name" maxLength={100} />
      </div>
      <div className="space-y-3">
        <Label className="pl-1" htmlFor="company">
          company
        </Label>
        <Input
          id="company"
          name="company"
          autoComplete="organization"
          maxLength={120}
        />
      </div>
      <div className="space-y-3">
        <Label className="pl-1" htmlFor="email">
          email
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          spellCheck={false}
          maxLength={200}
        />
      </div>

      <div className="space-y-3">
        <Label className="pl-1">how should we meet</Label>
        <RadioGroup
          value={conferencing}
          onValueChange={(v) => setConferencing(v as Conferencing)}
          className="grid gap-2"
        >
          <Label
            htmlFor="conf-meet"
            className="flex cursor-pointer items-center gap-3 rounded-lg border bg-card p-3 font-normal transition-colors hover:bg-accent"
          >
            <RadioGroupItem value="meet" id="conf-meet" />
            <span>google meet</span>
          </Label>
          <Label
            htmlFor="conf-phone"
            className="flex cursor-pointer items-center gap-3 rounded-lg border bg-card p-3 font-normal transition-colors hover:bg-accent"
          >
            <RadioGroupItem value="phone" id="conf-phone" />
            <span>quick call</span>
          </Label>
          <Label
            htmlFor="conf-other"
            className="flex cursor-pointer items-center gap-3 rounded-lg border bg-card p-3 font-normal transition-colors hover:bg-accent"
          >
            <RadioGroupItem value="other" id="conf-other" />
            <span>byol - bring your own link</span>
          </Label>
        </RadioGroup>
      </div>

      <div
        className={`grid transition-all duration-200 ease-out ${
          conferencing === "phone"
            ? "grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="space-y-2 pt-1">
            <Label htmlFor="phone">phone number</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              maxLength={40}
              tabIndex={conferencing === "phone" ? 0 : -1}
            />
          </div>
        </div>
      </div>

      <div
        className={`grid transition-all duration-200 ease-out ${
          conferencing === "other"
            ? "grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="space-y-3 pt-1">
            <Label htmlFor="meetingLink">meeting link</Label>
            <Input
              className="text-muted-foreground text-sm"
              id="meetingLink"
              name="meetingLink"
              type="url"
              inputMode="url"
              placeholder=""
              maxLength={500}
              tabIndex={conferencing === "other" ? 0 : -1}
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <Label className="pl-1" htmlFor="notes">
          anything else you'd like me to know?
        </Label>
        <Input id="notes" name="notes" />
      </div>

      <div className="flex items-center justify-between gap-3">
        <Label className="pl-1">pie charts are good</Label>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant={pieCharts === "yes" ? "default" : "outline"}
            onClick={() => setPieCharts(pieCharts === "yes" ? null : "yes")}
            className="h-7 px-3 text-xs"
          >
            yes
          </Button>
          <Button
            type="button"
            size="sm"
            variant={pieCharts === "no" ? "default" : "outline"}
            onClick={() => setPieCharts(pieCharts === "no" ? null : "no")}
            className="h-7 px-3 text-xs"
          >
            no
          </Button>
        </div>
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "booking…" : "confirm booking"}
      </Button>
    </form>
  );
}
