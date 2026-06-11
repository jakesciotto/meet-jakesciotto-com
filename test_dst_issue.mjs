// Test if there's an actual functional issue with DST boundaries
import { fromZonedTime } from "date-fns-tz";

// The question: on a DST boundary, does creating identical moments 
// and then mutating one actually work correctly?

console.log("=== CRITICAL TEST: Are the results FUNCTIONALLY CORRECT? ===\n");

function dayBoundsUtc(date, tz) {
  const start = fromZonedTime(`${date}T00:00:00`, tz);
  const end = fromZonedTime(`${date}T00:00:00`, tz);
  end.setUTCDate(end.getUTCDate() + 1);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

// Alternative implementation: more explicit
function dayBoundsUtc_alternative(date, tz) {
  const start = fromZonedTime(`${date}T00:00:00`, tz);
  // Get the next day's midnight and convert it
  const [y, m, d] = date.split('-').map(Number);
  const nextDate = new Date(y, m - 1, d + 1);
  const nextDateStr = `${nextDate.getUTCFullYear()}-${String(nextDate.getUTCMonth() + 1).padStart(2, '0')}-${String(nextDate.getUTCDate()).padStart(2, '0')}`;
  const end = fromZonedTime(`${nextDateStr}T00:00:00`, tz);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

const testDates = [
  "2026-06-09",  // Regular day
  "2026-03-08",  // Spring forward
  "2026-11-01",  // Fall back
];

console.log("Current Implementation vs. Alternative:");
testDates.forEach(date => {
  const current = dayBoundsUtc(date, "America/New_York");
  const alt = dayBoundsUtc_alternative(date, "America/New_York");
  
  console.log(`\n${date}:`);
  console.log(`  Current:     [${current.startIso}, ${current.endIso})`);
  console.log(`  Alternative: [${alt.startIso}, ${alt.endIso})`);
  console.log(`  Match? ${current.startIso === alt.startIso && current.endIso === alt.endIso}`);
});

// Most importantly: does the current approach produce the CORRECT SEMANTICS?
console.log("\n\n=== SEMANTIC TEST: Does it capture all wall-clock times on the given date? ===\n");

function testBounds(date, tz) {
  const bounds = dayBoundsUtc(date, tz);
  const startTime = new Date(bounds.startIso).getTime();
  const endTime = new Date(bounds.endIso).getTime();
  
  return {
    startIso: bounds.startIso,
    endIso: bounds.endIso,
    startTime,
    endTime,
    durationHours: (endTime - startTime) / (1000 * 60 * 60)
  };
}

testDates.forEach(date => {
  const bounds = testBounds(date, "America/New_York");
  console.log(`\n${date}:`);
  console.log(`  Start (UTC): ${bounds.startIso}`);
  console.log(`  End (UTC):   ${bounds.endIso}`);
  console.log(`  Duration:    ${bounds.durationHours} hours`);
  console.log(`  CORRECT? ${bounds.durationHours === 24 ? 'YES (24h)' : 'NO (expected 24h)'}`);
});

// The REAL potential issue: what if we query with wall-clock times outside the bounds?
console.log("\n\n=== EDGE CASE: What about bookings exactly at midnight boundaries? ===\n");

// A booking exactly at midnight of the query date in wall-clock time
const marchBounds = dayBoundsUtc("2026-03-08", "America/New_York");
console.log("2026-03-08 bounds: [" + marchBounds.startIso + ", " + marchBounds.endIso + ")");

// What if someone has a booking scheduled for "2026-03-09 00:00:00" (next day midnight)?
const nextDayMidnight = fromZonedTime("2026-03-09T00:00:00", "America/New_York").toISOString();
console.log("2026-03-09 00:00 NY in UTC:", nextDayMidnight);
console.log("Would be EXCLUDED? (should be yes)", nextDayMidnight >= marchBounds.endIso);
