import Link from "next/link";
import { notFound } from "next/navigation";
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

export default async function SuccessPage({ params }: Props) {
  const { id } = await params;
  const supabase = serviceClient();
  const { data, error } = await supabase
    .from("bookings")
    .select(
      "invitee_name, invitee_email, starts_at, conferencing, cancelled_at",
    )
    .eq("id", id)
    .single();
  if (error || !data) notFound();

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="space-y-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          You&rsquo;re booked.
        </h1>
        <p className="text-base">
          {data.invitee_name}, your meeting is set for{" "}
          <strong>{formatWhen(data.starts_at)}</strong>.
        </p>
        <p className="text-sm text-muted-foreground">
          A confirmation email is on its way to {data.invitee_email}. If you
          don&rsquo;t see it, check your spam folder.
        </p>
        {data.cancelled_at && (
          <p className="text-sm font-medium text-destructive">
            This booking has been cancelled.
          </p>
        )}
        <div className="space-y-2">
          <Button asChild variant="outline" className="w-full">
            <Link href={`/book/cancel/${id}`}>Cancel this booking</Link>
          </Button>
          <Button asChild variant="ghost" className="w-full">
            <Link href="/">Book another time</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
