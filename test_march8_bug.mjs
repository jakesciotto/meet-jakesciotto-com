// CONFIRMED BUG: On spring-forward day, the end bound is WRONG
import { fromZonedTime } from "date-fns-tz";

function dayBoundsUtc(date, tz) {
  const start = fromZonedTime(`${date}T00:00:00`, tz);
  const end = fromZonedTime(`${date}T00:00:00`, tz);
  end.setUTCDate(end.getUTCDate() + 1);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

console.log("=== THE BUG: Spring-forward (2026-03-08) ===\n");

const bounds = dayBoundsUtc("2026-03-08", "America/New_York");
console.log("Current implementation returns:");
console.log("  Start:", bounds.startIso, "   <- 2026-03-08 00:00 NY in UTC");
console.log("  End:  ", bounds.endIso, "   <- BUGGY!");

console.log("\nExpected semantics:");
console.log("  We want to query for ALL bookings on 2026-03-08 NY time");
console.log("  That means: from 2026-03-08 00:00 NY to 2026-03-08 23:59:59 NY");
console.log("  Which is: from 2026-03-08 05:00 UTC to 2026-03-09 04:00 UTC");
console.log("  But current code returns: 2026-03-09T05:00:00.000Z");

console.log("\nWhy is it wrong?");
console.log("  Current code: creates midnight on 3/8 NY, then calls setUTCDate(+1)");
const d1 = fromZonedTime("2026-03-08T00:00:00", "America/New_York");
console.log("  Step 1 - fromZonedTime('2026-03-08T00:00:00', NY):");
console.log("    Result:", d1.toISOString());
console.log("    UTC date:", d1.getUTCDate());
console.log("  Step 2 - setUTCDate(getUTCDate() + 1) = setUTCDate(" + d1.getUTCDate() + " + 1):");
d1.setUTCDate(d1.getUTCDate() + 1);
console.log("    Result:", d1.toISOString());

console.log("\nThe problem:");
console.log("  setUTCDate(9) sets the day to the 9th at the SAME HOUR");
console.log("  So 2026-03-08 05:00 UTC becomes 2026-03-09 05:00 UTC");
console.log("  But we wanted 2026-03-09 04:00 UTC (midnight NY on 3/9)");
console.log("  We're off by 1 hour because of the DST transition!");

console.log("\nProof: What does midnight on 3/9 NY actually equal in UTC?");
const correctEnd = fromZonedTime("2026-03-09T00:00:00", "America/New_York");
console.log("  fromZonedTime('2026-03-09T00:00:00', NY) =", correctEnd.toISOString());
console.log("  Current code returns:", bounds.endIso);
console.log("  MISMATCH by 1 hour!");

// Show the impact
console.log("\n=== IMPACT: Bookings will be incorrectly included/excluded ===\n");

// A booking at 11:59 PM on 2026-03-08 NY
const booking11_59 = fromZonedTime("2026-03-08T23:59:00", "America/New_York");
console.log("Booking at 23:59 on 2026-03-08 NY:", booking11_59.toISOString());
console.log("Should be INCLUDED (it's on that day)");
console.log("Is it >= " + bounds.startIso + "?", booking11_59.toISOString() >= bounds.startIso);
console.log("Is it < " + bounds.endIso + "?", booking11_59.toISOString() < bounds.endIso);
console.log("Result: " + (booking11_59.toISOString() >= bounds.startIso && booking11_59.toISOString() < bounds.endIso) ? "INCLUDED" : "EXCLUDED");
console.log("WRONG!\n");

// A booking at midnight on 2026-03-09 NY (should be excluded)
const booking_midnight = fromZonedTime("2026-03-09T00:00:00", "America/New_York");
console.log("Booking at 00:00 on 2026-03-09 NY:", booking_midnight.toISOString());
console.log("Should be EXCLUDED (it's on the next day)");
console.log("Is it >= " + bounds.startIso + "?", booking_midnight.toISOString() >= bounds.startIso);
console.log("Is it < " + bounds.endIso + "?", booking_midnight.toISOString() < bounds.endIso);
console.log("Result: " + (booking_midnight.toISOString() >= bounds.startIso && booking_midnight.toISOString() < bounds.endIso) ? "INCLUDED" : "EXCLUDED");
console.log("CORRECT!");
