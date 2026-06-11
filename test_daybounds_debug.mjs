// Quick test to understand fromZonedTime behavior
import { fromZonedTime } from "date-fns-tz";

function dayBoundsUtc(date, tz) {
  const start = fromZonedTime(`${date}T00:00:00`, tz);
  const end = fromZonedTime(`${date}T00:00:00`, tz);
  end.setUTCDate(end.getUTCDate() + 1);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

// Test regular day (June 9, 2026 - EDT)
console.log("=== Regular day (2026-06-09) ===");
const regular = dayBoundsUtc("2026-06-09", "America/New_York");
console.log("Start:", regular.startIso);
console.log("End:", regular.endIso);

// Test spring-forward day (March 8, 2026 - EST->EDT transition)
console.log("\n=== Spring-forward day (2026-03-08) ===");
const springForward = dayBoundsUtc("2026-03-08", "America/New_York");
console.log("Start:", springForward.startIso);
console.log("End:", springForward.endIso);

// Test fall-back day (November 1, 2026 - EDT->EST transition)
console.log("\n=== Fall-back day (2026-11-01) ===");
const fallBack = dayBoundsUtc("2026-11-01", "America/New_York");
console.log("Start:", fallBack.startIso);
console.log("End:", fallBack.endIso);

// Test the underlying behavior: what does fromZonedTime return?
console.log("\n=== Understanding fromZonedTime ===");
const d1 = fromZonedTime("2026-06-09T00:00:00", "America/New_York");
console.log("fromZonedTime('2026-06-09T00:00:00', 'America/New_York'):", d1.toISOString());
console.log("getUTCDate():", d1.getUTCDate());
d1.setUTCDate(d1.getUTCDate() + 1);
console.log("After setUTCDate(+1):", d1.toISOString());

// Check if there's an actual difference between start and end in dayBoundsUtc
console.log("\n=== Checking if start === end before mutation ===");
const start = fromZonedTime("2026-06-09T00:00:00", "America/New_York");
const end = fromZonedTime("2026-06-09T00:00:00", "America/New_York");
console.log("start.getTime():", start.getTime());
console.log("end.getTime():", end.getTime());
console.log("Are they equal before mutation?", start.getTime() === end.getTime());

// Check what actually happens on DST boundaries
console.log("\n=== DST Spring Forward (2026-03-08) ===");
const springD = fromZonedTime("2026-03-08T00:00:00", "America/New_York");
console.log("midnight NY on spring-forward day in UTC:", springD.toISOString());
console.log("UTC date:", springD.getUTCDate());
console.log("UTC month:", springD.getUTCMonth() + 1);
springD.setUTCDate(springD.getUTCDate() + 1);
console.log("After +1 day:", springD.toISOString());

// Now test: does setUTCDate actually advance by 24 hours on spring-forward?
console.log("\n=== Time delta on spring-forward ===");
const before = fromZonedTime("2026-03-08T00:00:00", "America/New_York");
const after = fromZonedTime("2026-03-08T00:00:00", "America/New_York");
after.setUTCDate(after.getUTCDate() + 1);
const deltaMs = after.getTime() - before.getTime();
const deltaHours = deltaMs / (1000 * 60 * 60);
console.log("Delta in hours:", deltaHours);
console.log("Expected: 24 hours (86400000 ms)");
console.log("Actual delta:", deltaMs, "ms");
