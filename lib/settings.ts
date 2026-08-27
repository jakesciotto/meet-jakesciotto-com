import type { SupabaseClient } from "@supabase/supabase-js";

export type Settings = {
  /** Non-cancelled site bookings allowed per host-TZ day. null = no limit. */
  maxBookingsPerDay: number | null;
  minNoticeHours: number;
  horizonDays: number;
};

export const DEFAULT_SETTINGS: Settings = {
  maxBookingsPerDay: null,
  minNoticeHours: 24,
  horizonDays: 60,
};

type SettingsRow = {
  max_bookings_per_day: number | null;
  min_notice_hours: number;
  horizon_days: number;
};

export async function loadSettings(supabase: SupabaseClient): Promise<Settings> {
  const { data, error } = await supabase
    .from("settings")
    .select("max_bookings_per_day, min_notice_hours, horizon_days")
    .eq("id", 1)
    .maybeSingle<SettingsRow>();
  if (error) throw new Error(`Failed to load settings: ${error.message}`);
  if (!data) return DEFAULT_SETTINGS;
  return {
    maxBookingsPerDay: data.max_bookings_per_day,
    minNoticeHours: data.min_notice_hours,
    horizonDays: data.horizon_days,
  };
}
