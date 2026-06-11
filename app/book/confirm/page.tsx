import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { BookingForm } from "@/components/booking-form";
import { config } from "@/lib/config";

type Search = Promise<{ date?: string; start?: string }>;

function formatHeader(startIso: string): string {
  const day = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: config.hostTz,
  })
    .format(new Date(startIso))
    .toLowerCase();
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: config.hostTz,
  })
    .format(new Date(startIso))
    .toLowerCase();
  return `${day} at ${time}`;
}

export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Search;
}) {
  const { date, start } = await searchParams;
  if (!date || !start) notFound();

  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col justify-center px-4 py-10">
      <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500">
        <div className="mb-6">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/?date=${date}`}>← pick a different time</Link>
          </Button>
        </div>
        <header className="mb-6 space-y-1">
          <h1 className="border-b border-primary/20 pb-2 font-mono text-lg font-semibold tracking-tight lowercase">
            {formatHeader(start)}
          </h1>
          <p className="text-sm text-muted-foreground">
            tell me a little about yourself and how we'll meet
          </p>
        </header>
        <BookingForm date={date} startIso={start} />
      </div>
    </main>
  );
}
