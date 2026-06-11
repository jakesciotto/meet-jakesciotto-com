import Link from "next/link";
import { Button } from "@/components/ui/button";

export type SlotListItem = {
  startIso: string;
  label: string;
};

export function SlotList({ date, slots }: { date: string; slots: SlotListItem[] }) {
  if (slots.length === 0) {
    return (
      <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300">
        No times available on this day. Try another date.
      </p>
    );
  }
  return (
    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {slots.map((s) => (
        <li key={s.startIso}>
          <Button
            asChild
            variant="outline"
            className="h-12 w-full justify-center font-mono text-base tracking-tight transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-sm"
          >
            <Link
              href={{
                pathname: "/book/confirm",
                query: { date, start: s.startIso },
              }}
              prefetch
            >
              {s.label}
            </Link>
          </Button>
        </li>
      ))}
    </ul>
  );
}
