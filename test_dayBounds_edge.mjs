import { fromZonedTime } from "date-fns-tz";

// Test the actual pattern used in get-slots.ts
function dayBoundsUtc_current(date, tz) {
  const start = fromZonedTime(`${date}T00:00:00`, tz);
  const end = fromZonedTime(`${date}T00:00:00`, tz);
  end.setUTCDate(end.getUTCDate() + 1);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

// Test what happens if we try to use end for queries - e.g., .lt("starts_at", endIso)
// For 2026-06-09 in NY:
// start = 2026-06-09T04:00:00Z (00:00 NY = 04:00 UTC EDT)
// end = 2026-06-10T04:00:00Z (adding 1 day via setUTCDate)

// This queries: starts_at >= 2026-06-09T04:00:00Z AND starts_at < 2026-06-10T04:00:00Z
// But we want: all bookings that fall on 2026-06-09 in host TZ (midnight to midnight host TZ)
// So this is correct by accident because June is before DST ends

// But what if the query is for a date that ENDS in a different offset?
// A booking could start on 2026-06-09 at 23:00 UTC, which is 2026-06-09 19:00 EDT (7pm NY)
// And end on 2026-06-10 at 02:00 UTC, which is 2026-06-09 22:00 EDT (10pm NY)
// The slot window is 2026-06-09T04:00:00Z to 2026-06-10T04:00:00Z
// So the 23:00 UTC start would be caught. That's correct.

// Let me verify the actual issue: this is actually CORRECT for normal cases.
// The .lt("starts_at", endIso) in get-slots.ts line 40 means:
// "Get bookings that START before the end of tomorrow midnight host TZ in UTC"
// This correctly includes all bookings that could fall on the date in host TZ.

console.log("Checking date boundary logic:");

const result = dayBoundsUtc_current("2026-06-09", "America/New_York");
console.log("2026-06-09 bounds in UTC:", result);

// A booking from 23:00 UTC to 02:00 UTC next day
const booking = { start: "2026-06-10T03:00:00Z", end: "2026-06-10T04:00:00Z" };
console.log("Booking start:", booking.start);
console.log("Query checks: gte('starts_at', '" + result.startIso + "') && lt('starts_at', '" + result.endIso + "')");
console.log("Booking passes:", booking.start >= result.startIso && booking.start < result.endIso);

// Edge case: booking at end of window
const edgeBooking = { start: "2026-06-10T03:59:59Z", end: "2026-06-10T04:00:00Z" };
console.log("\nEdge booking:", edgeBooking.start);
console.log("Edge booking passes:", edgeBooking.start >= result.startIso && edgeBooking.start < result.endIso);

// Edge case: booking right at boundary
const boundaryBooking = { start: "2026-06-10T04:00:00Z", end: "2026-06-10T04:30:00Z" };
console.log("\nBoundary booking:", boundaryBooking.start);
console.log("Boundary booking passes:", boundaryBooking.start >= result.startIso && boundaryBooking.start < result.endIso);
