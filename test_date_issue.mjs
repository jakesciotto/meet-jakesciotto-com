// The booking-picker.tsx uses:
function toIsoDate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseIsoDate(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function pad(n) {
  return String(n).padStart(2, "0");
}

// When a visitor clicks a date in the calendar (client-side),
// the Date object is in their LOCAL BROWSER timezone
// E.g., visitor in US/Pacific clicks "2026-06-09" 
// In their browser: new Date(2026, 5, 9) in Pacific time
// This creates a Date that represents midnight Pacific time on 2026-06-09

// But then toIsoDate() uses getFullYear/getMonth/getDate which are
// NAIVE (local) methods, not UTC methods!

const visitorDate = new Date(2026, 5, 9); // June 9, 2026 at midnight in LOCAL tz
console.log("Visitor in browser creates:", visitorDate.toString());
console.log("toIsoDate result:", toIsoDate(visitorDate));

// The issue: if visitor is in US/Pacific (UTC-7), this represents:
// 2026-06-09T00:00:00 Pacific = 2026-06-09T07:00:00 UTC
// But toIsoDate(visitorDate) returns "2026-06-09"
// This is correct - the date string represents midnight-to-midnight in the VISITOR'S timezone

// However, when this is sent to the server for getSlots(date),
// the server interprets "2026-06-09" as midnight-to-midnight in the HOST timezone!
// If host is America/New_York, then "2026-06-09" means:
// 2026-06-09T00:00:00 NY = 2026-06-09T05:00:00 UTC
// But the visitor wanted 2026-06-09T07:00:00 UTC!
// So the server is showing slots for the WRONG date - off by hours.

console.log("\n=== THE BUG ===");
console.log("Visitor in US/Pacific clicks calendar for June 9");
console.log("Browser Date (midnight Pacific): 2026-06-09T00:00:00-07:00");
console.log("  = UTC time: 2026-06-09T07:00:00Z");
console.log("toIsoDate converts to: 2026-06-09");
console.log("Server receives: '2026-06-09'");
console.log("Server interprets in host TZ (NY): 2026-06-09T00:00:00 NY");
console.log("  = UTC time: 2026-06-09T05:00:00Z");
console.log("MISMATCH: Visitor expects 06/09 Pacific but got 06/09 NY");
console.log("Server should have interpreted as VISITOR's local date, not HOST's date");
