export const config = {
  hostTz: process.env.HOST_TZ ?? "America/New_York",
  slotMinutes: 30,
  slotAlignmentMinutes: 30,
  minNoticeHours: 24,
  horizonDays: 60,
  adminEmail: process.env.ADMIN_EMAIL ?? "jake.sciotto@gmail.com",
  appUrl: process.env.APP_URL ?? "http://localhost:3000",
} as const;

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}
