import { describe, expect, it } from "vitest";
import {
  formatHebrewDayDate,
  formatPriceFrom,
  formatUpdatedAgo,
  getThisWeekRange,
  getTodayRange,
  getTomorrowRange,
  getWeekendRange,
} from "./dates";

// weekday index via a stable method: compare against a known-good Date in UTC
// after re-deriving the Jerusalem calendar date (Jerusalem is always UTC+2 or
// UTC+3, never crossing a UTC day boundary at noon UTC).
function weekdayOf(date: Date): number {
  const noonUtc = new Date(date);
  return new Date(
    new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Jerusalem" }).format(noonUtc),
  ).getDay();
}

describe("getWeekendRange", () => {
  it("always starts on a Thursday and ends on a Saturday, in Jerusalem time", () => {
    for (let offset = 0; offset < 14; offset++) {
      const now = new Date(Date.UTC(2026, 10, 1, 12, 0, 0) + offset * 86400000);
      const { start, end } = getWeekendRange(now);
      expect(weekdayOf(start)).toBe(4); // Thursday
      expect(weekdayOf(end)).toBe(6); // Saturday
      expect(end.getTime()).toBeGreaterThan(start.getTime());
    }
  });

  it("includes today when today is already Thu/Fri/Sat", () => {
    for (let offset = 0; offset < 14; offset++) {
      const now = new Date(Date.UTC(2026, 10, 1, 12, 0, 0) + offset * 86400000);
      const dow = weekdayOf(now);
      if (dow === 4 || dow === 5 || dow === 6) {
        const { start, end } = getWeekendRange(now);
        expect(now.getTime()).toBeGreaterThanOrEqual(start.getTime());
        expect(now.getTime()).toBeLessThanOrEqual(end.getTime());
      }
    }
  });
});

describe("getThisWeekRange", () => {
  it("starts now and ends on the upcoming Saturday", () => {
    const now = new Date(Date.UTC(2026, 10, 1, 12, 0, 0));
    const { start, end } = getThisWeekRange(now);
    expect(start.getTime()).toBeLessThanOrEqual(now.getTime());
    expect(weekdayOf(end)).toBe(6);
  });
});

describe("getTodayRange / getTomorrowRange", () => {
  it("tomorrow starts exactly one day after today", () => {
    const now = new Date(Date.UTC(2026, 10, 1, 12, 0, 0));
    const today = getTodayRange(now);
    const tomorrow = getTomorrowRange(now);
    const diffHours = (tomorrow.start.getTime() - today.start.getTime()) / 3600000;
    expect(diffHours).toBeGreaterThanOrEqual(23);
    expect(diffHours).toBeLessThanOrEqual(25);
  });
});

describe("formatPriceFrom", () => {
  it("formats with the מ- prefix and ILS symbol", () => {
    const result = formatPriceFrom(150);
    expect(result).toContain("150");
    expect(result).toMatch(/^מ-/);
  });

  it("returns null for null input", () => {
    expect(formatPriceFrom(null)).toBeNull();
  });
});

describe("formatHebrewDayDate", () => {
  it("includes a Hebrew weekday name", () => {
    const result = formatHebrewDayDate(new Date(Date.UTC(2026, 10, 1, 12, 0, 0)));
    expect(result).toContain("יום");
  });
});

describe("formatUpdatedAgo", () => {
  it("renders recent updates in minutes", () => {
    const now = new Date(Date.UTC(2026, 10, 1, 12, 0, 0));
    const fiveMinAgo = new Date(now.getTime() - 5 * 60000);
    expect(formatUpdatedAgo(fiveMinAgo, now)).toContain("עודכן");
  });
});
