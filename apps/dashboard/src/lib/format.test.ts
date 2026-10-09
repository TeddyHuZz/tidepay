import { describe, expect, it } from "vitest";
import { formatDateTimeUtc, formatTimeUtc, shortAddress, slugify } from "./format";

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
});
