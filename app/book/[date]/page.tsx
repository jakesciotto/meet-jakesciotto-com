import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SlotList, type SlotListItem } from "@/components/slot-list";
import { getSlots } from "@/actions/get-slots";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ date: string }> };

function formatHeader(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

function formatSlot(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: config.hostTz,
  }).format(new Date(iso));
}

export default async function SlotsPage({ params }: Props) {
  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();

  const slots = await getSlots(date);
  const items: SlotListItem[] = slots.map((s) => ({
    startIso: s.startsAt.toISOString(),
    label: formatSlot(s.startsAt.toISOString()),
  }));

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col justify-center px-4 py-10">
      <div className="anim-in-fade-up">
        <div className="mb-6 flex items-center justify-between">
          <Button asChild variant="ghost" size="sm">
            <Link href="/">← Pick a different date</Link>
          </Button>
        </div>
        <header className="mb-6 space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">{formatHeader(date)}</h1>
          <p className="text-sm text-muted-foreground">
            Times shown in {config.hostTz.replace("_", " ")}.
          </p>
        </header>
        <SlotList date={date} slots={items} />
      </div>
    </main>
  );
}
