import Link from "next/link";
import { notFound } from "next/navigation";
import { CancelBookingButton } from "@/components/cancel-button";
import { Button } from "@/components/ui/button";
import { serviceClient } from "@/lib/supabase";
import { config } from "@/lib/config";

type Props = { params: Promise<{ id: string }> };

function formatWhen(startsAt: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
    timeZone: config.hostTz,
  }).format(new Date(startsAt));
}

export default async function CancelPage({ params }: Props) {
  const { id } = await params;
  const supabase = serviceClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("invitee_name, starts_at, cancelled_at")
    .eq("id", id)
    .single();
  if (error || !data) notFound();

  if (data.cancelled_at) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Already cancelled</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          This booking was cancelled.{" "}
          <Link href="/" className="underline">Book another time</Link>.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="space-y-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Cancel this booking?</h1>
        <p>
          Your meeting on <strong>{formatWhen(data.starts_at)}</strong> will be cancelled and
          everyone will be notified.
        </p>
        <div className="space-y-2">
          <CancelBookingButton bookingId={id} />
          <Button asChild variant="ghost" className="w-full">
            <Link href={`/book/success/${id}`}>Keep the booking</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
