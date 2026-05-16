"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { createBooking } from "@/actions/create-booking";

type Conferencing = "meet" | "phone";

function isLikelyEmail(s: string): boolean {
  if (s.length < 3 || s.length > 200) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
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

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const data = new FormData(e.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const company = String(data.get("company") ?? "").trim();
    const email = String(data.get("email") ?? "").trim().toLowerCase();
    const phone =
      conferencing === "phone"
        ? String(data.get("phone") ?? "").trim()
        : undefined;
    const notes = String(data.get("notes") ?? "").trim() || undefined;

    if (!name) return setError("Please enter your name.");
    if (!company) return setError("Please enter your company.");
    if (!isLikelyEmail(email)) return setError("That doesn't look like a valid email address.");
    if (conferencing === "phone" && !phone) {
      return setError("Please enter a phone number so I can call you.");
    }

    const input = { date, startIso, name, company, email, conferencing, phone, notes };

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
        <div className="anim-in-fade-up">
          <Alert variant="destructive">
            <AlertTitle>We couldn&rsquo;t book that</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      <div className="anim-in-fade-up space-y-2" style={{ animationDelay: "0ms" }}>
        <Label htmlFor="name">Your name</Label>
        <Input id="name" name="name" autoComplete="name" maxLength={100} />
      </div>
      <div className="anim-in-fade-up space-y-2" style={{ animationDelay: "60ms" }}>
        <Label htmlFor="company">Company</Label>
        <Input
          id="company"
          name="company"
          autoComplete="organization"
          maxLength={120}
        />
      </div>
      <div className="anim-in-fade-up space-y-2" style={{ animationDelay: "120ms" }}>
        <Label htmlFor="email">Email</Label>
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

      <div className="anim-in-fade-up space-y-2" style={{ animationDelay: "180ms" }}>
        <Label>How should we meet?</Label>
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
            <span>Google Meet (video)</span>
          </Label>
          <Label
            htmlFor="conf-phone"
            className="flex cursor-pointer items-center gap-3 rounded-lg border bg-card p-3 font-normal transition-colors hover:bg-accent"
          >
            <RadioGroupItem value="phone" id="conf-phone" />
            <span>Quick call</span>
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
            <Label htmlFor="phone">Phone number</Label>
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

      <div className="anim-in-fade-up space-y-2" style={{ animationDelay: "180ms" }}>
        <Label htmlFor="notes">Anything I should know? (optional)</Label>
        <Input id="notes" name="notes" />
      </div>

      <div className="anim-in-fade-up" style={{ animationDelay: "240ms" }}>
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? "Booking…" : "Confirm booking"}
        </Button>
      </div>
    </form>
  );
}
