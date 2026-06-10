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
        <h1 className="text-2xl font-semibold tracking-tight text-signal">
          you&rsquo;re booked. how cool.
        </h1>
        <p className="text-base">
          {data.invitee_name}, your meeting is set for{" "}
          <strong className="font-mono tracking-tight lowercase">
            {formatWhen(data.starts_at)}
          </strong>
          .
        </p>
        <p className="text-sm text-muted-foreground">
          this very cool site sent you a confirmation email to{" "}
          {data.invitee_email}. if you don&rsquo;t see it, check your spam
          folder or some shit. i don't know.
        </p>
        <p className="text-sm text-muted-foreground">
          if you answered "yes" to if pie charts are cool or not, be prepared to
          defend that bullshit.
        </p>
        {data.cancelled_at && (
          <p className="text-sm font-medium text-destructive">
            this booking has been cancelled.
          </p>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
          <Button asChild variant="secondary" size="lg">
            <Link href={`/book/cancel/${id}`}>cancel this booking</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/">book another time</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
