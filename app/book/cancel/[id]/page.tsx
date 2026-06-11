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
        <h1 className="text-2xl font-semibold tracking-tight">
          Already cancelled
        </h1>
        <p className="mt-4 text-sm text-muted-foreground">
          this booking was cancelled.{" "}
          <Link href="/" className="underline">
            book another time
          </Link>
          .
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="space-y-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          cancel this booking?
        </h1>
        <p>
          your meeting on{" "}
          <strong className="tracking-tight lowercase">
            {formatWhen(data.starts_at)}
          </strong>{" "}
          will be
          cancelled and everyone will be incredibly disappointed and talk about
          it behind your back.
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
          <CancelBookingButton bookingId={id} />
          <Button asChild variant="outline" className="w-full" size="lg">
            <Link href={`/book/success/${id}`}>keep the booking</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
