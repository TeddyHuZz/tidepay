import { describe, expect, it } from "vitest";
import { formatCountdown, formatDateTimeUtc, formatTimeUtc, shortAddress, slugify } from "./format";

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("PromptPilot Pro")).toBe("promptpilot-pro");
  });

  it("collapses punctuation and trims hyphens", () => {
    expect(slugify("  --Team & Co.!  ")).toBe("team-co");
  });

  it("returns an empty string when nothing usable remains", () => {
    expect(slugify("***")).toBe("");
  });
});

describe("shortAddress", () => {
  it("shortens long addresses", () => {
    expect(shortAddress("8fVqKd3nKdAbCdEfGh")).toBe("8fVq…EfGh");
  });

  it("leaves short values alone", () => {
    expect(shortAddress("abc")).toBe("abc");
  });
});

describe("UTC formatting", () => {
  it("formats time in UTC regardless of host timezone", () => {
    expect(formatTimeUtc("2026-10-09T12:41:08Z")).toBe("12:41:08");
  });

  it("formats date and time in UTC", () => {
    expect(formatDateTimeUtc("2026-11-08T12:41:08Z")).toContain("12:41");
    expect(formatDateTimeUtc("2026-11-08T12:41:08Z")).toMatch(/UTC$/);
  });

  it("returns placeholder for missing or invalid date strings", () => {
    expect(formatDateTimeUtc("—")).toBe("—");
    expect(formatDateTimeUtc("not-a-date")).toBe("—");
  });
});

describe("formatCountdown", () => {
  it("formats mm:ss for durations under an hour", () => {
    expect(formatCountdown(36_000, 0)).toBe("00:36");
    expect(formatCountdown(125_000, 0)).toBe("02:05");
  });

  it("formats hh:mm:ss for durations under a day", () => {
    expect(formatCountdown(3665_000, 0)).toBe("01:01:05");
  });

  it("formats days and hours for longer durations", () => {
    expect(formatCountdown(86400_000 * 2 + 3600_000 * 5, 0)).toBe("2d 5h");
  });

  it("returns 00:00 when past", () => {
    expect(formatCountdown(0, 1000)).toBe("00:00");
  });
});
