import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { BookingForm } from "@/components/booking-form";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";

type Search = Promise<{ date?: string; start?: string }>;

function formatHeader(date: string, startIso: string): string {
  const day = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: config.hostTz,
  }).format(new Date(startIso));
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: config.hostTz,
  }).format(new Date(startIso));
  return `${day} at ${time}`;
}

export default async function ConfirmPage({ searchParams }: { searchParams: Search }) {
  const { date, start } = await searchParams;
  if (!date || !start) notFound();

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/book/${date}`}>← Pick a different time</Link>
        </Button>
      </div>
      <header className="mb-6 space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">{formatHeader(date, start)}</h1>
        <p className="text-sm text-muted-foreground">
          Tell me a bit about you and how to meet.
        </p>
      </header>
      <BookingForm date={date} startIso={start} />
    </main>
  );
}
