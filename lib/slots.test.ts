import { describe, it, expect } from "vitest";
import {
  computeSlots,
  rulesForDate,
  type AvailabilityRule,
  type BusyRange,
} from "./slots";

const HOST_TZ = "America/New_York";

const baseConfig = {
  slotMinutes: 30,
  slotAlignmentMinutes: 30,
  minNoticeHours: 24,
  hostTz: HOST_TZ,
};

// A weekday with rule 9:00-12:00 = 6 slots (9, 9:30, 10, 10:30, 11, 11:30)
const nineToNoon: AvailabilityRule[] = [
  { startMinute: 9 * 60, endMinute: 12 * 60 },
];

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
      {
        start: new Date("2026-06-09T14:00:00Z"),
        end: new Date("2026-06-09T15:00:00Z"),
      },
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
        {
          start: new Date("2026-06-09T13:00:00Z"),
          end: new Date("2026-06-09T13:30:00Z"),
        },
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
    expect(underBy1s[0].startsAt.toISOString()).toBe(
      "2026-06-09T13:30:00.000Z",
    );
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

describe("computeSlots meeting lengths", () => {
  const weekBefore = new Date("2026-06-01T12:00:00Z");
  const withLength = (slotMinutes: number, slotAlignmentMinutes: number) => ({
    ...baseConfig,
    slotMinutes,
    slotAlignmentMinutes,
  });
  const starts = (slots: ReturnType<typeof computeSlots>) =>
    slots.map((s) => s.startsAt.toISOString());

  it("offers 15 minute meetings every 15 minutes", () => {
    const slots = computeSlots({
      date: "2026-06-09",
      rules: [{ startMinute: 9 * 60, endMinute: 10 * 60 }],
      busyRanges: [],
      bookings: [],
      now: weekBefore,
      config: withLength(15, 15),
    });
    expect(starts(slots)).toEqual([
      "2026-06-09T13:00:00.000Z",
      "2026-06-09T13:15:00.000Z",
      "2026-06-09T13:30:00.000Z",
      "2026-06-09T13:45:00.000Z",
    ]);
    expect(slots[0].endsAt.toISOString()).toBe("2026-06-09T13:15:00.000Z");
  });

  it("offers 45 minute meetings every 30 minutes and drops starts that run past the window", () => {
    const slots = computeSlots({
      date: "2026-06-09",
      rules: nineToNoon,
      busyRanges: [],
      bookings: [],
      now: weekBefore,
      config: withLength(45, 30),
    });
    // 11:30 would end at 12:15, past the noon close.
    expect(starts(slots)).toEqual([
      "2026-06-09T13:00:00.000Z",
      "2026-06-09T13:30:00.000Z",
      "2026-06-09T14:00:00.000Z",
      "2026-06-09T14:30:00.000Z",
      "2026-06-09T15:00:00.000Z",
    ]);
    expect(slots[0].endsAt.toISOString()).toBe("2026-06-09T13:45:00.000Z");
  });

  it("hides every 45 minute start that overlaps a 45 minute booking", () => {
    const slots = computeSlots({
      date: "2026-06-09",
      rules: nineToNoon,
      busyRanges: [],
      bookings: [
        {
          start: new Date("2026-06-09T13:00:00Z"),
          end: new Date("2026-06-09T13:45:00Z"),
        },
      ],
      now: weekBefore,
      config: withLength(45, 30),
    });
    // 9:00 is taken and 9:30 overlaps until 9:45. 10:00 is the first clear start.
    expect(starts(slots)).toEqual([
      "2026-06-09T14:00:00.000Z",
      "2026-06-09T14:30:00.000Z",
      "2026-06-09T15:00:00.000Z",
    ]);
  });

  it("offers 60 minute meetings every 30 minutes", () => {
    const slots = computeSlots({
      date: "2026-06-09",
      rules: nineToNoon,
      busyRanges: [],
      bookings: [],
      now: weekBefore,
      config: withLength(60, 30),
    });
    expect(starts(slots)).toEqual([
      "2026-06-09T13:00:00.000Z",
      "2026-06-09T13:30:00.000Z",
      "2026-06-09T14:00:00.000Z",
      "2026-06-09T14:30:00.000Z",
      "2026-06-09T15:00:00.000Z",
    ]);
    expect(slots[4].endsAt.toISOString()).toBe("2026-06-09T16:00:00.000Z");
  });
});

describe("computeSlots daily cap", () => {
  const cappedAt = (n: number | null) => ({ ...baseConfig, maxBookingsPerDay: n });
  const bookingAt = (iso: string): BusyRange => ({
    start: new Date(iso),
    end: new Date(new Date(iso).getTime() + 30 * 60 * 1000),
  });
  const weekBefore = new Date("2026-06-01T12:00:00Z");

  it("returns no slots when bookings on the day reach the cap", () => {
    const slots = computeSlots({
      date: "2026-06-09",
      rules: nineToNoon,
      busyRanges: [],
      bookings: [bookingAt("2026-06-09T13:00:00Z"), bookingAt("2026-06-09T14:00:00Z")],
      now: weekBefore,
      config: cappedAt(2),
    });
    expect(slots).toEqual([]);
  });

  it("keeps the remaining slots while bookings are under the cap", () => {
    const slots = computeSlots({
      date: "2026-06-09",
      rules: nineToNoon,
      busyRanges: [],
      bookings: [bookingAt("2026-06-09T13:00:00Z")],
      now: weekBefore,
      config: cappedAt(2),
    });
    expect(slots).toHaveLength(5);
  });

  it("applies no cap when maxBookingsPerDay is null", () => {
    const slots = computeSlots({
      date: "2026-06-09",
      rules: nineToNoon,
      busyRanges: [],
      bookings: [bookingAt("2026-06-09T13:00:00Z"), bookingAt("2026-06-09T14:00:00Z")],
      now: weekBefore,
      config: cappedAt(null),
    });
    expect(slots).toHaveLength(4);
  });

  it("counts only bookings that start on that host-timezone date", () => {
    // 2026-06-09T03:59:59Z is still June 8 in New York (EDT, UTC-4).
    const previousDay = computeSlots({
      date: "2026-06-09",
      rules: nineToNoon,
      busyRanges: [],
      bookings: [bookingAt("2026-06-09T03:59:59Z")],
      now: weekBefore,
      config: cappedAt(1),
    });
    expect(previousDay).toHaveLength(6);

    // 2026-06-09T04:00:00Z is June 9 00:00 in New York.
    const sameDay = computeSlots({
      date: "2026-06-09",
      rules: nineToNoon,
      busyRanges: [],
      bookings: [bookingAt("2026-06-09T04:00:00Z")],
      now: weekBefore,
      config: cappedAt(1),
    });
    expect(sameDay).toEqual([]);
  });

  it("uses the 25-hour host day on DST fall-back when counting", () => {
    // 2026-11-01 in New York runs from 04:00Z (EDT midnight) to 2026-11-02T05:00Z (EST midnight).
    // A booking at 2026-11-02T04:30Z is Nov 1, 23:30 EST and must count.
    const slots = computeSlots({
      date: "2026-11-01",
      rules: nineToNoon,
      busyRanges: [],
      bookings: [bookingAt("2026-11-02T04:30:00Z")],
      now: new Date("2026-10-25T12:00:00Z"),
      config: cappedAt(1),
    });
    expect(slots).toEqual([]);
  });
});

describe("rulesForDate", () => {
  const weekday: AvailabilityRule[] = [{ startMinute: 9 * 60, endMinute: 17 * 60 }];
  const override: AvailabilityRule[] = [{ startMinute: 10 * 60, endMinute: 12 * 60 }];
  // 2026-06-09 is a Tuesday (weekday 2). 2026-06-11 is a Thursday (weekday 4).
  const rulesByWeekday = { 2: weekday };

  it("uses the override windows for that date instead of the weekday rules", () => {
    expect(
      rulesForDate("2026-06-09", {
        rulesByWeekday,
        overridesByDate: { "2026-06-09": override },
      }),
    ).toEqual(override);
  });

  it("opens a weekday that has no rules when an override exists", () => {
    expect(
      rulesForDate("2026-06-11", {
        rulesByWeekday,
        overridesByDate: { "2026-06-11": override },
      }),
    ).toEqual(override);
  });

  it("falls back to the weekday rules when there is no override", () => {
    expect(rulesForDate("2026-06-09", { rulesByWeekday, overridesByDate: {} })).toEqual(weekday);
  });

  it("returns no rules when neither an override nor a weekday rule exists", () => {
    expect(rulesForDate("2026-06-11", { rulesByWeekday, overridesByDate: {} })).toEqual([]);
  });

  it("returns no rules for a blocked date even when an override exists", () => {
    expect(
      rulesForDate("2026-06-09", {
        rulesByWeekday,
        overridesByDate: { "2026-06-09": override },
        blockedDates: new Set(["2026-06-09"]),
      }),
    ).toEqual([]);
  });
});
