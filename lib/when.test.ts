import { describe, expect, it } from "vitest";
import { formatMeetingWhen, formatSlotTime, isoDateIn, tzLabel } from "./when";

const slot = new Date("2026-10-20T20:00:00Z"); // 4:00 PM New York, 2:00 PM Denver, 9:00 PM London

describe("formatSlotTime", () => {
  it("renders the instant in the given zone", () => {
    expect(formatSlotTime(slot, "America/New_York")).toBe("4:00 PM");
    expect(formatSlotTime(slot, "America/Denver")).toBe("2:00 PM");
    expect(formatSlotTime(slot, "Europe/London")).toBe("9:00 PM");
  });

  it("prefixes the weekday when the visitor's date differs from the host date", () => {
    const late = new Date("2026-10-21T02:30:00Z"); // Oct 20 10:30 PM New York, Oct 21 in Tokyo
    expect(formatSlotTime(late, "America/New_York", "2026-10-20")).toBe("10:30 PM");
    expect(formatSlotTime(late, "Asia/Tokyo", "2026-10-20")).toBe("Wed 11:30 AM");
  });
});

describe("formatMeetingWhen", () => {
  it("names the zone so the reader cannot misread it", () => {
    expect(formatMeetingWhen(slot, "America/Denver")).toBe("Tuesday, October 20 at 2:00 PM MDT");
    expect(formatMeetingWhen(slot, "Europe/London")).toBe("Tuesday, October 20 at 9:00 PM GMT+1");
  });
});

describe("helpers", () => {
  it("isoDateIn gives the calendar date in the zone", () => {
    expect(isoDateIn(new Date("2026-10-21T02:30:00Z"), "America/New_York")).toBe("2026-10-20");
    expect(isoDateIn(new Date("2026-10-21T02:30:00Z"), "Asia/Tokyo")).toBe("2026-10-21");
  });
  it("tzLabel replaces underscores", () => {
    expect(tzLabel("America/New_York")).toBe("America/New York");
  });
});
