import { beforeEach, describe, expect, it } from "vitest";
import { checkRateLimit, clientIp, resetRateLimits } from "./rate-limit";

beforeEach(() => resetRateLimits());

describe("checkRateLimit", () => {
  it("allows up to the limit then blocks", () => {
    const now = 1_000;
    for (let i = 0; i < 3; i++) expect(checkRateLimit("k", 3, 60_000, now).ok).toBe(true);
    const blocked = checkRateLimit("k", 3, 60_000, now);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(60);
  });

  it("reports the remaining wait", () => {
    checkRateLimit("k", 1, 60_000, 0);
    expect(checkRateLimit("k", 1, 60_000, 45_000).retryAfterSeconds).toBe(15);
  });

  it("resets after the window", () => {
    checkRateLimit("k", 1, 60_000, 0);
    expect(checkRateLimit("k", 1, 60_000, 60_000).ok).toBe(true);
  });

  it("tracks keys independently", () => {
    checkRateLimit("a", 1, 60_000, 0);
    expect(checkRateLimit("b", 1, 60_000, 0).ok).toBe(true);
  });
});

describe("clientIp", () => {
  it("uses the first forwarded address", () => {
    const request = new Request("http://x", { headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" } });
    expect(clientIp(request)).toBe("1.2.3.4");
  });

  it("falls back to unknown", () => {
    expect(clientIp(new Request("http://x"))).toBe("unknown");
  });
});
