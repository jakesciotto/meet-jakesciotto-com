import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_SETTINGS, loadSettings } from "./settings";

type Result = { data: unknown; error: { message: string } | null };

function fakeClient(result: Result) {
  const tables: string[] = [];
  const filters: [string, unknown][] = [];
  const query = {
    select: () => query,
    eq: (col: string, val: unknown) => {
      filters.push([col, val]);
      return query;
    },
    maybeSingle: async () => result,
  };
  const client = {
    from: (table: string) => {
      tables.push(table);
      return query;
    },
  } as unknown as SupabaseClient;
  return { client, tables, filters };
}

describe("loadSettings", () => {
  it("reads the singleton row from the settings table", async () => {
    const { client, tables, filters } = fakeClient({ data: null, error: null });
    await loadSettings(client);
    expect(tables).toEqual(["settings"]);
    expect(filters).toEqual([["id", 1]]);
  });

  it("returns the defaults when the row is missing", async () => {
    const { client } = fakeClient({ data: null, error: null });
    await expect(loadSettings(client)).resolves.toEqual(DEFAULT_SETTINGS);
    expect(DEFAULT_SETTINGS).toEqual({
      maxBookingsPerDay: null,
      minNoticeHours: 24,
      horizonDays: 60,
    });
  });

  it("maps the row columns onto the settings shape", async () => {
    const { client } = fakeClient({
      data: { max_bookings_per_day: 3, min_notice_hours: 48, horizon_days: 30 },
      error: null,
    });
    await expect(loadSettings(client)).resolves.toEqual({
      maxBookingsPerDay: 3,
      minNoticeHours: 48,
      horizonDays: 30,
    });
  });

  it("keeps a null cap as null", async () => {
    const { client } = fakeClient({
      data: { max_bookings_per_day: null, min_notice_hours: 24, horizon_days: 60 },
      error: null,
    });
    const settings = await loadSettings(client);
    expect(settings.maxBookingsPerDay).toBeNull();
  });

  it("throws when the query fails instead of falling back", async () => {
    const { client } = fakeClient({
      data: null,
      error: { message: 'relation "public.settings" does not exist' },
    });
    await expect(loadSettings(client)).rejects.toThrow(/settings/);
  });
});
