"use client";

import { useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

function readBrowserTz(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
  } catch {
    return null;
  }
}

export function useVisitorTz(fallback: string): string {
  const tz = useSyncExternalStore(subscribe, readBrowserTz, () => null);
  return tz ?? fallback;
}
