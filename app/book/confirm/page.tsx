import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { BookingForm } from "@/components/booking-form";
import { config } from "@/lib/config";
import { DEFAULT_DURATION, parseDuration } from "@/lib/durations";
import { LocalTime } from "@/components/local-time";

type Search = Promise<{ date?: string; start?: string; duration?: string }>;

export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Search;
}) {
  const { date, start, duration: rawDuration } = await searchParams;
  if (!date || !start) notFound();
  const duration = rawDuration === undefined ? DEFAULT_DURATION : parseDuration(rawDuration);
  if (!duration) notFound();

  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col justify-center px-4 py-10">
      <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500">
        <div className="mb-6">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/?date=${date}&duration=${duration}`}>← pick a different time</Link>
          </Button>
        </div>
        <header className="mb-6 space-y-1">
          <h1 className="border-b border-primary/20 pb-2 text-lg font-semibold tracking-tight lowercase">
            <LocalTime iso={start} hostTz={config.hostTz} format="when" lowercase /> for{" "}
            {duration} minutes
          </h1>
          <p className="text-sm text-muted-foreground">
            tell me a little about yourself and how we&rsquo;ll meet
          </p>
        </header>
        <BookingForm date={date} startIso={start} duration={duration} />
      </div>
    </main>
  );
}
