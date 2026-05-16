export function SlotListSkeleton() {
  return (
    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2" aria-hidden>
      {Array.from({ length: 8 }).map((_, i) => (
        <li
          key={i}
          className="h-12 animate-pulse rounded-lg bg-muted/70"
        />
      ))}
    </ul>
  );
}
