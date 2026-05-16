import { describe, it, expect } from "vitest";
import { computeSlots, type AvailabilityRule, type BusyRange } from "./slots";

const HOST_TZ = "America/New_York";

const baseConfig = {
  slotMinutes: 30,
  slotAlignmentMinutes: 30,
  minNoticeHours: 24,
  hostTz: HOST_TZ,
};

// A weekday with rule 9:00-12:00 = 6 slots (9, 9:30, 10, 10:30, 11, 11:30)
const nineToNoon: AvailabilityRule[] = [{ startMinute: 9 * 60, endMinute: 12 * 60 }];

describe("computeSlots", () => {
  it("returns slots across a 9-12 window when nothing is busy", () => {
    // Tue 2026-06-09 in NY. Now = 2026-06-01 (8 days before), so min-notice is satisfied.
    const slots = computeSlots({
      date: "2026-06-09",
      rules: nineToNoon,
      busyRanges: [],
      bookings: [],
      now: new Date("2026-06-01T12:00:00Z"),
      config: baseConfig,
    });
    expect(slots).toHaveLength(6);
    // First slot starts at 9am NY = 13:00 UTC on 2026-06-09 (EDT)
    expect(slots[0].startsAt.toISOString()).toBe("2026-06-09T13:00:00.000Z");
    expect(slots[5].startsAt.toISOString()).toBe("2026-06-09T15:30:00.000Z");
  });

  it("returns empty when no rules", () => {
    const slots = computeSlots({
      date: "2026-06-09",
      rules: [],
      busyRanges: [],
      bookings: [],
      now: new Date("2026-06-01T12:00:00Z"),
      config: baseConfig,
    });
    expect(slots).toEqual([]);
  });

  it("excludes slots that overlap a busy range", () => {
    // Busy 10:00-11:00 NY = 14:00-15:00 UTC on EDT date
    const busy: BusyRange[] = [
      { start: new Date("2026-06-09T14:00:00Z"), end: new Date("2026-06-09T15:00:00Z") },
    ];
    const slots = computeSlots({
      date: "2026-06-09",
      rules: nineToNoon,
      busyRanges: busy,
      bookings: [],
      now: new Date("2026-06-01T12:00:00Z"),
      config: baseConfig,
    });
    // 9:00 and 9:30 OK; 10:00 and 10:30 collide; 11:00 (ends 11:30) and 11:30 (ends 12:00) OK
    const starts = slots.map((s) => s.startsAt.toISOString());
    expect(starts).toEqual([
      "2026-06-09T13:00:00.000Z",
      "2026-06-09T13:30:00.000Z",
      "2026-06-09T15:00:00.000Z",
      "2026-06-09T15:30:00.000Z",
    ]);
  });

  it("treats existing bookings as busy", () => {
    const slots = computeSlots({
      date: "2026-06-09",
      rules: nineToNoon,
      busyRanges: [],
      bookings: [
        { start: new Date("2026-06-09T13:00:00Z"), end: new Date("2026-06-09T13:30:00Z") },
      ],
      now: new Date("2026-06-01T12:00:00Z"),
      config: baseConfig,
    });
    expect(slots[0].startsAt.toISOString()).toBe("2026-06-09T13:30:00.000Z");
    expect(slots).toHaveLength(5);
  });

  it("excludes slots that would end past the availability window", () => {
    // Window 9:00-10:15 in NY would be 3 slots (9, 9:30) — 10:00 slot ends at 10:30, past 10:15
    const slots = computeSlots({
      date: "2026-06-09",
      rules: [{ startMinute: 9 * 60, endMinute: 9 * 60 + 75 }],
      busyRanges: [],
      bookings: [],
      now: new Date("2026-06-01T12:00:00Z"),
      config: baseConfig,
    });
    expect(slots).toHaveLength(2);
  });

  it("enforces minimum notice (24h)", () => {
    // Now = 2026-06-09T08:00:00Z (4am NY same day). All 9-12 NY slots are within 24h.
    const slots = computeSlots({
      date: "2026-06-09",
      rules: nineToNoon,
      busyRanges: [],
      bookings: [],
      now: new Date("2026-06-09T08:00:00Z"),
      config: baseConfig,
    });
    expect(slots).toEqual([]);
  });

  it("includes slot exactly 24h out, excludes one second under", () => {
    // First slot is 2026-06-09T13:00:00Z. 24h before = 2026-06-08T13:00:00Z.
    const exactly = computeSlots({
      date: "2026-06-09",
      rules: nineToNoon,
      busyRanges: [],
      bookings: [],
      now: new Date("2026-06-08T13:00:00Z"),
      config: baseConfig,
    });
    expect(exactly[0].startsAt.toISOString()).toBe("2026-06-09T13:00:00.000Z");

    const underBy1s = computeSlots({
      date: "2026-06-09",
      rules: nineToNoon,
      busyRanges: [],
      bookings: [],
      now: new Date("2026-06-08T13:00:01Z"),
      config: baseConfig,
    });
    expect(underBy1s[0].startsAt.toISOString()).toBe("2026-06-09T13:30:00.000Z");
  });

  it("handles multiple availability windows in one day", () => {
    // 9-11 and 1pm-3pm NY
    const rules: AvailabilityRule[] = [
      { startMinute: 9 * 60, endMinute: 11 * 60 },
      { startMinute: 13 * 60, endMinute: 15 * 60 },
    ];
    const slots = computeSlots({
      date: "2026-06-09",
      rules,
      busyRanges: [],
      bookings: [],
      now: new Date("2026-06-01T12:00:00Z"),
      config: baseConfig,
    });
    // 4 slots in each window = 8 total
    expect(slots).toHaveLength(8);
    expect(slots[0].startsAt.toISOString()).toBe("2026-06-09T13:00:00.000Z"); // 9am NY = 13 UTC EDT
    expect(slots[4].startsAt.toISOString()).toBe("2026-06-09T17:00:00.000Z"); // 1pm NY = 17 UTC EDT
  });

  it("handles DST spring-forward (2026-03-08, NY loses 2-3am)", () => {
    // 2026-03-08 is DST start in US. Slots at midnight->3am would be weird, but
    // 9-12 should produce 6 normal slots, just shifted in UTC from EST to EDT.
    const slots = computeSlots({
      date: "2026-03-08",
      rules: nineToNoon,
      busyRanges: [],
      bookings: [],
      now: new Date("2026-03-01T12:00:00Z"),
      config: baseConfig,
    });
    expect(slots).toHaveLength(6);
    // After spring-forward, NY is UTC-4 (EDT). 9am NY = 13 UTC.
    expect(slots[0].startsAt.toISOString()).toBe("2026-03-08T13:00:00.000Z");
  });

  it("handles DST fall-back (2026-11-01, NY gains 1-2am)", () => {
    // 2026-11-01 is DST end. 9-12 NY produces 6 slots; before fall-back NY was EDT, after EST.
    // Since slots are after 9am (well past 2am), they should be in EST: 9am NY = 14 UTC.
    const slots = computeSlots({
      date: "2026-11-01",
      rules: nineToNoon,
      busyRanges: [],
      bookings: [],
      now: new Date("2026-10-25T12:00:00Z"),
      config: baseConfig,
    });
    expect(slots).toHaveLength(6);
    expect(slots[0].startsAt.toISOString()).toBe("2026-11-01T14:00:00.000Z");
  });
});
