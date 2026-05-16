import type { Slot } from "./slots";

type CacheEntry = { expires: number; slots: Slot[] };

const CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export function getCachedSlots(key: string): Slot[] | null {
  const entry = CACHE.get(key);
  if (!entry || entry.expires <= Date.now()) return null;
  return entry.slots;
}

export function setCachedSlots(key: string, slots: Slot[]): void {
  CACHE.set(key, { expires: Date.now() + CACHE_TTL_MS, slots });
}

export function clearSlotsCache(): void {
  CACHE.clear();
}
