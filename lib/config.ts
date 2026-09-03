const adminEmail = requireEnv("ADMIN_EMAIL");

export const config = {
  hostTz: process.env.HOST_TZ ?? "America/New_York",
  adminEmail,
  notifyEmail: process.env.NOTIFY_EMAIL ?? adminEmail,
  appUrl: process.env.APP_URL ?? "http://localhost:3000",
} as const;

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}
