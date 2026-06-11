// Check fall-back day (opposite problem expected)
import { fromZonedTime } from "date-fns-tz";

function dayBoundsUtc(date, tz) {
  const start = fromZonedTime(`${date}T00:00:00`, tz);
  const end = fromZonedTime(`${date}T00:00:00`, tz);
  end.setUTCDate(end.getUTCDate() + 1);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

console.log("=== FALL-BACK 2026-11-01 ===\n");

const bounds = dayBoundsUtc("2026-11-01", "America/New_York");
console.log("Current bounds: [" + bounds.startIso + ", " + bounds.endIso + ")");

console.log("\nExpected: all wall-clock times 2026-11-01 00:00 to 2026-11-01 23:59 NY");
const start_ny = fromZonedTime("2026-11-01T00:00:00", "America/New_York");
const end_ny = fromZonedTime("2026-11-01T23:59:59", "America/New_York");
console.log("  From: " + start_ny.toISOString());
console.log("  To:   " + end_ny.toISOString());

console.log("\nFirst moment of 2026-11-02 NY:");
const next_day = fromZonedTime("2026-11-02T00:00:00", "America/New_York");
console.log("  " + next_day.toISOString());
console.log("  Should be >= endIso to be excluded");
console.log("  Is it? " + (next_day.toISOString() >= bounds.endIso));

if (next_day.toISOString() < bounds.endIso) {
  console.log("\nBUG FOUND!");
  const booking = fromZonedTime("2026-11-02T01:00:00", "America/New_York");
  console.log("Booking at 2026-11-02 01:00 NY: " + booking.toISOString());
  console.log("Will it be included? " + (booking.toISOString() >= bounds.startIso && booking.toISOString() < bounds.endIso));
  console.log("Should it? NO (it's on 11-02)");
}
