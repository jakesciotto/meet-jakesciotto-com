// Test the actual calendar flow

function todayInTz_impl(tz) {
  // Simulates: toZonedTime(now, tz) -> formatYmd -> "2026-06-09"
  // This would return "2026-06-09" if the host is in NY and now is June 9 NY time
  return "2026-06-09";
}

function parseIsoDate(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
  // This creates a Date in the BROWSER's local timezone!
}

function toIsoDate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  // This uses getFullYear/getMonth/getDate which are LOCAL, not UTC
}

function pad(n) {
  return String(n).padStart(2, "0");
}

console.log("=== SCENARIO: Visitor in US/Pacific, Host in US/New_York ===\n");

// Server sends: today = "2026-06-09" (today in NY)
const today = todayInTz_impl("America/New_York");
console.log("1. Server computed 'today' in NY:", today);

// Client calendar uses parseIsoDate to show this date disabled
const todayDateInBrowser = parseIsoDate(today);
console.log("2. Browser creates Date from 'today':", todayDateInBrowser.toString());
console.log("   This Date is in browser's local TZ (Pacific)");

// Visitor clicks on a date far in the future (to avoid min-notice issues)
// Calendar is showing June 2026. Visitor sees June 9 and clicks it.
// In the calendar UI, June 9 is displayed because that's what "today" was.
// But from the visitor's Pacific perspective, June 9 in Pacific is June 8-9 in NY!

// When visitor clicks June 9 on calendar:
const visitorClicksDate = new Date(2026, 5, 9); // June 9 at midnight in BROWSER local (Pacific)
console.log("\n3. Visitor clicks June 9 on calendar");
console.log("   Browser Date created: 2026-06-09T00:00:00 Pacific");
console.log("   ISO string: " + toIsoDate(visitorClicksDate));
console.log("   This is: " + visitorClicksDate.toISOString());

console.log("\n4. Server receives date string: " + toIsoDate(visitorClicksDate));
console.log("   Server interprets as: 2026-06-09 in America/New_York");
console.log("   = 2026-06-09T05:00:00Z UTC");
console.log("   But visitor wanted: 2026-06-09T07:00:00Z (Pacific midnight)");
console.log("\n   ERROR: Off by 2 hours!");

console.log("\n=== ROOT CAUSE ===");
console.log("parseIsoDate('2026-06-09') uses new Date(2026, 5, 9)");
console.log("  This creates date in BROWSER local TZ");
console.log("  But the ISO string '2026-06-09' should represent a date in HOST TZ");
console.log("  The two timezones don't match!");
