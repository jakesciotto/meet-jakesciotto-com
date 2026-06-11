// CAREFUL ANALYSIS: Is this really a bug?
import { fromZonedTime } from "date-fns-tz";

function dayBoundsUtc(date, tz) {
  const start = fromZonedTime(`${date}T00:00:00`, tz);
  const end = fromZonedTime(`${date}T00:00:00`, tz);
  end.setUTCDate(end.getUTCDate() + 1);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

console.log("=== CAREFUL RE-ANALYSIS: Spring-forward 2026-03-08 ===\n");

// The semantics should be:
// "All wall-clock times from 2026-03-08 00:00:00 NY to 2026-03-08 23:59:59.999 NY"

// Let's think about this step-by-step:
console.log("Wall-clock time 2026-03-08 00:00:00 NY =?");
const start_ny = fromZonedTime("2026-03-08T00:00:00", "America/New_York");
console.log("  " + start_ny.toISOString());

console.log("\nWall-clock time 2026-03-08 23:59:59.999 NY =?");
const end_ny = fromZonedTime("2026-03-08T23:59:59.999", "America/New_York");
console.log("  " + end_ny.toISOString());

console.log("\nSo correct bounds should be:");
console.log("  From: " + start_ny.toISOString());
console.log("  To:   " + end_ny.toISOString());

// Now what does the current code return?
const bounds = dayBoundsUtc("2026-03-08", "America/New_York");
console.log("\nCurrent code returns:");
console.log("  startIso: " + bounds.startIso);
console.log("  endIso:   " + bounds.endIso);

// The issue: does endIso capture the entire day?
console.log("\nDoes current endIso correctly exclude next day?");
console.log("  First UTC moment on 2026-03-09 NY:");
const next_day_start = fromZonedTime("2026-03-09T00:00:00", "America/New_York");
console.log("    " + next_day_start.toISOString());
console.log("  Is it >= endIso? (should be >= to be excluded)");
console.log("    " + next_day_start.toISOString() + " >= " + bounds.endIso + "?");
console.log("    " + (next_day_start.toISOString() >= bounds.endIso) + " <- PROBLEM!");

console.log("\n=== THE REAL ISSUE ===");
console.log("The 'end' in dayBoundsUtc() is created as: fromZonedTime('2026-03-08T00:00:00', NY)");
console.log("Then setUTCDate(+1) is called, which changes the UTC date from 8 to 9");
console.log("But it keeps the same UTC HOUR (5:00)");
console.log("\nOn the spring-forward day, NY offset changes from UTC-5 to UTC-4");
console.log("So the next day's midnight (2026-03-09 00:00 NY) is actually at");
console.log("2026-03-09T04:00:00.000Z (because NY is now UTC-4)");
console.log("\nBut the code returns 2026-03-09T05:00:00.000Z");
console.log("This is 1 hour PAST the actual next day's midnight in NY!");

// THIS IS THE BUG
console.log("\n=== CONCRETE BUG SCENARIO ===");
console.log("Query for bookings on 2026-03-08");
console.log("Bounds: [2026-03-08T05:00:00.000Z, 2026-03-09T05:00:00.000Z)");
console.log("\nA booking scheduled at 2026-03-09 00:30:00 NY");
const booking = fromZonedTime("2026-03-09T00:30:00", "America/New_York");
console.log("  In UTC:", booking.toISOString());
console.log("  Is it < 2026-03-09T05:00:00.000Z?", booking.toISOString() < bounds.endIso);
console.log("  Is it >= 2026-03-08T05:00:00.000Z?", booking.toISOString() >= bounds.startIso);
console.log("  INCLUDED in the query? YES - WRONG! Should be excluded (it's on the next calendar day)");
