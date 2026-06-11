// Test if the current implementation correctly bounds bookings
import { fromZonedTime } from "date-fns-tz";

function dayBoundsUtc(date, tz) {
  const start = fromZonedTime(`${date}T00:00:00`, tz);
  const end = fromZonedTime(`${date}T00:00:00`, tz);
  end.setUTCDate(end.getUTCDate() + 1);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

// Simulate booking queries
console.log("=== SIMULATION: Query for bookings on 2026-06-09 ===");
const bounds = dayBoundsUtc("2026-06-09", "America/New_York");
console.log("Query bounds:");
console.log("  startIso (gte):", bounds.startIso);  // 2026-06-09T04:00:00.000Z
console.log("  endIso (lt):", bounds.endIso);        // 2026-06-10T04:00:00.000Z

console.log("\nWhy these times?");
console.log("  2026-06-09 midnight NY = 2026-06-09 04:00 UTC (EDT, NY is UTC-4)");
console.log("  2026-06-10 midnight NY = 2026-06-10 04:00 UTC");

console.log("\nExpected bookings in UTC:");
console.log("  - A booking at 09:00 NY on 2026-06-09 = 13:00 UTC (MATCHES)");
console.log("  - A booking at 23:59 NY on 2026-06-09 = 03:59 UTC next day (MATCHES)");
console.log("  - A booking at 00:00 NY on 2026-06-10 = 04:00 UTC (EXCLUDED by lt)");

// Check if query would correctly exclude next day
const booking1 = "2026-06-09T13:00:00.000Z"; // 9am NY on correct day
const booking2 = "2026-06-10T04:00:00.000Z"; // exactly midnight NY of next day
const booking3 = "2026-06-10T03:59:59.000Z"; // almost midnight NY of next day

console.log("\n=== Query result simulation ===");
console.log(`Booking at ${booking1}:`);
console.log(`  gte 2026-06-09T04:00:00Z? ${booking1 >= bounds.startIso}`);
console.log(`  lt 2026-06-10T04:00:00Z? ${booking1 < bounds.endIso}`);
console.log(`  INCLUDE? ${booking1 >= bounds.startIso && booking1 < bounds.endIso}`);

console.log(`\nBooking at ${booking2}:`);
console.log(`  gte 2026-06-09T04:00:00Z? ${booking2 >= bounds.startIso}`);
console.log(`  lt 2026-06-10T04:00:00Z? ${booking2 < bounds.endIso}`);
console.log(`  INCLUDE? ${booking2 >= bounds.startIso && booking2 < bounds.endIso}`);

console.log(`\nBooking at ${booking3}:`);
console.log(`  gte 2026-06-09T04:00:00Z? ${booking3 >= bounds.startIso}`);
console.log(`  lt 2026-06-10T04:00:00Z? ${booking3 < bounds.endIso}`);
console.log(`  INCLUDE? ${booking3 >= bounds.startIso && booking3 < bounds.endIso}`);

// Most critical: Check DST edge case
console.log("\n\n=== DST EDGE CASE: Spring-forward (2026-03-08) ===");
const dstBounds = dayBoundsUtc("2026-03-08", "America/New_York");
console.log("Bounds: [" + dstBounds.startIso + ", " + dstBounds.endIso + ")");

console.log("\nExpected: all wall-clock times on 2026-03-08 NY");
console.log("  - 2026-03-08 00:00 NY = 2026-03-08 05:00 UTC (EST, UTC-5)");
console.log("  - 2026-03-08 23:59 NY = 2026-03-09 04:59 UTC (EDT, UTC-4 - spring forward happened!)");
console.log("  - 2026-03-09 00:00 NY = 2026-03-09 04:00 UTC (EDT, UTC-4)");

// The REAL question: Is the delta actually 24 hours, or does DST affect it?
const springBefore = fromZonedTime("2026-03-08T00:00:00", "America/New_York");
const springAfter = fromZonedTime("2026-03-08T00:00:00", "America/New_York");
springAfter.setUTCDate(springAfter.getUTCDate() + 1);
const actualDelta = springAfter.getTime() - springBefore.getTime();
console.log("\nActual time delta from midnight NY 3/8 to midnight NY 3/9:", actualDelta / (1000*3600), "hours");

// For FALL-BACK, the question is inverted
console.log("\n\n=== DST EDGE CASE: Fall-back (2026-11-01) ===");
const fallBounds = dayBoundsUtc("2026-11-01", "America/New_York");
console.log("Bounds: [" + fallBounds.startIso + ", " + fallBounds.endIso + ")");

const fallBefore = fromZonedTime("2026-11-01T00:00:00", "America/New_York");
const fallAfter = fromZonedTime("2026-11-01T00:00:00", "America/New_York");
fallAfter.setUTCDate(fallAfter.getUTCDate() + 1);
const fallDelta = fallAfter.getTime() - fallBefore.getTime();
console.log("Actual time delta from midnight NY 11/1 to midnight NY 11/2:", fallDelta / (1000*3600), "hours");
