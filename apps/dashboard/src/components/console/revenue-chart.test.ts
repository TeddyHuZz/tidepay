import { describe, expect, it } from "vitest";
import { bucketDailyRevenue, buildNearPlanEvents } from "./revenue-chart";

describe("bucketDailyRevenue", () => {
  it("sums net USDC and counts settlements per day across ms and second timestamps", () => {
    const now = Date.UTC(2026, 10, 15, 12, 0, 0);
    const buckets = bucketDailyRevenue(
      [
        {
          signature: "a",
          kind: "settled",
          label: "Settlement",
          timestamp: now - 3600_000, // today (day 29)
          timeFormatted: "",
          err: false,
          amountNetUsdc: "+0.94",
        },
        {
          signature: "b",
          kind: "subscribed",
          label: "Subscribed",
          timestamp: Math.floor((now - 3600_000) / 1000), // seconds timestamp, same day
          timeFormatted: "",
          err: false,
          amountNetUsdc: "1.00",
        },
      ],
      now,
    );

    expect(buckets).toHaveLength(30);
    expect(buckets[29].amount).toBeCloseTo(1.94, 5);
    expect(buckets[29].count).toBe(2);
    expect(buckets[0].amount).toBe(0);
  });
});

describe("buildNearPlanEvents", () => {
  it("expands multi-cycle NEAR subscriptions into one event per paid cycle", () => {
    const events = buildNearPlanEvents(
      [
        {
          id: "premium-pro:alice.testnet",
          wallet: "alice.testnet",
          plan: "premium-pro",
          startedAt: "2026-11-14T17:20:00.000Z",
          lastBilledAt: "2026-11-14T17:26:00.000Z",
          nextDueAt: "2026-11-14T17:29:00.000Z",
          status: "Active",
          network: "near",
          cycleCount: 3,
          prepaidLeftUsdc: "0.00",
          prepaidCyclesLeft: 0,
          totalPaidUsdc: "3.00",
        },
      ],
      [
        {
          id: "near:premium-pro",
          name: "premium-pro",
          priceUsdc: "1.00",
          intervalSeconds: 180,
          subscribers: 1,
          active: true,
          network: "near",
        },
      ],
    );

    expect(events).toHaveLength(3);
    expect(events.map((e) => e.kind)).toEqual(["settled", "settled", "subscribed"]);
    expect(events.every((e) => e.amountNetUsdc === "0.945")).toBe(true);
  });
});
