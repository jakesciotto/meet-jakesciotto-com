import Link from "next/link";
import { Button } from "@/components/ui/button";

export type SlotListItem = {
  startIso: string;
  label: string;
};

export function SlotList({ date, slots }: { date: string; slots: SlotListItem[] }) {
  if (slots.length === 0) {
    return (
      <p className="anim-in-fade rounded-lg border bg-card p-4 text-sm text-muted-foreground">
        No times available on this day. Try another date.
      </p>
    );
  }
  return (
    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {slots.map((s, i) => (
        <li
          key={s.startIso}
          className="anim-in-fade-up"
          style={{ animationDelay: `${Math.min(i * 45, 450)}ms` }}
        >
          <Button
            asChild
            variant="outline"
            className="h-12 w-full justify-center text-base transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-sm"
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
