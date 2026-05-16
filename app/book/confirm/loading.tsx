export default function Loading() {
  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col justify-center px-4 py-10">
      <div>
        <div className="mb-6 h-8 w-44 animate-pulse rounded-md bg-muted/60" />
        <header className="mb-6 space-y-2">
          <div className="h-6 w-3/4 animate-pulse rounded-md bg-muted/60" />
          <div className="h-4 w-1/2 animate-pulse rounded-md bg-muted/40" />
        </header>
        <div className="space-y-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-24 animate-pulse rounded-md bg-muted/40" />
              <div className="h-11 w-full animate-pulse rounded-lg bg-muted/60" />
            </div>
          ))}
          <div className="h-11 w-full animate-pulse rounded-lg bg-muted/60" />
        </div>
      </div>
    </main>
  );
}
