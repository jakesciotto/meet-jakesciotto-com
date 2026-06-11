import { fromZonedTime } from "date-fns-tz";

function dayBoundsUtc_original(date, tz) {
  const start = fromZonedTime(`${date}T00:00:00`, tz);
  const end = fromZonedTime(`${date}T00:00:00`, tz);  // BUG: Same wall-clock time!
  end.setUTCDate(end.getUTCDate() + 1);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

function dayBoundsUtc_fixed(date, tz) {
  const start = fromZonedTime(`${date}T00:00:00`, tz);
  const endDate = new Date(start);
  endDate.setUTCDate(endDate.getUTCDate() + 1);
  return { startIso: start.toISOString(), endIso: endDate.toISOString() };
}

// Test on a regular day
console.log("Regular day (2026-06-09):");
console.log("Original:", dayBoundsUtc_original("2026-06-09", "America/New_York"));
console.log("Fixed:", dayBoundsUtc_fixed("2026-06-09", "America/New_York"));

// Test on spring-forward day
console.log("\nSpring-forward day (2026-03-08):");
console.log("Original:", dayBoundsUtc_original("2026-03-08", "America/New_York"));
console.log("Fixed:", dayBoundsUtc_fixed("2026-03-08", "America/New_York"));

// Test on fall-back day
console.log("\nFall-back day (2026-11-01):");
console.log("Original:", dayBoundsUtc_original("2026-11-01", "America/New_York"));
console.log("Fixed:", dayBoundsUtc_fixed("2026-11-01", "America/New_York"));
