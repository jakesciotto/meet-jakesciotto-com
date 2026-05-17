export default function Loading() {
  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col justify-center px-4 py-10">
      <div className="space-y-6">
        <header className="space-y-2 text-center">
          <div className="mx-auto h-7 w-44 animate-pulse rounded-md bg-muted/60" />
          <div className="mx-auto h-4 w-32 animate-pulse rounded-md bg-muted/40" />
        </header>
        <div className="rounded-xl border bg-card p-3 shadow-sm">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-9 w-9 animate-pulse rounded-md bg-muted/40" />
              <div className="h-5 w-32 animate-pulse rounded-md bg-muted/40" />
              <div className="h-9 w-9 animate-pulse rounded-md bg-muted/40" />
            </div>
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 35 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square animate-pulse rounded-md bg-muted/40"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
