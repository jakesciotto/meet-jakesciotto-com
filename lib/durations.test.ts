import { describe, it, expect } from "vitest";
import {
  DEFAULT_DURATION,
  MEETING_DURATIONS,
  isMeetingDuration,
  parseDuration,
  slotAlignmentFor,
} from "./durations";

describe("MEETING_DURATIONS", () => {
  it("offers 15, 30, 45, and 60 minutes with 30 as the default", () => {
    expect([...MEETING_DURATIONS]).toEqual([15, 30, 45, 60]);
    expect(DEFAULT_DURATION).toBe(30);
  });
});

describe("isMeetingDuration", () => {
  it("accepts only the offered lengths", () => {
    expect(isMeetingDuration(15)).toBe(true);
    expect(isMeetingDuration(60)).toBe(true);
    expect(isMeetingDuration(20)).toBe(false);
    expect(isMeetingDuration(0)).toBe(false);
    expect(isMeetingDuration(NaN)).toBe(false);
  });
});

describe("parseDuration", () => {
  it("parses a URL or form value that names an offered length", () => {
    expect(parseDuration("15")).toBe(15);
    expect(parseDuration("30")).toBe(30);
    expect(parseDuration("45")).toBe(45);
    expect(parseDuration("60")).toBe(60);
  });

  it("returns null for anything else", () => {
    expect(parseDuration("20")).toBeNull();
    expect(parseDuration("30.0")).toBeNull();
    expect(parseDuration(" 30")).toBeNull();
    expect(parseDuration("-30")).toBeNull();
    expect(parseDuration("")).toBeNull();
    expect(parseDuration(null)).toBeNull();
    expect(parseDuration(undefined)).toBeNull();
  });
});

describe("slotAlignmentFor", () => {
  it("steps every 15 minutes for a 15 minute meeting", () => {
    expect(slotAlignmentFor(15)).toBe(15);
  });

  it("steps every 30 minutes for every longer meeting", () => {
    expect(slotAlignmentFor(30)).toBe(30);
    expect(slotAlignmentFor(45)).toBe(30);
    expect(slotAlignmentFor(60)).toBe(30);
  });
});
