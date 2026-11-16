import { describe, expect, it } from "vitest";
import { bucketDailyRevenue, buildNearPlanEvents, mergeNearSettlementEvents } from "./revenue-chart";

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
    expect(events.map((e) => e.amountNetUsdc)).toEqual(["0.945", "0.945", "0.995"]);
    expect(events.map((e) => e.keeperFeeUsdc)).toEqual(["0.05", "0.05", "0.00"]);
    expect(events.every((e) => e.planAddress === "near:premium-pro")).toBe(true);
    expect(events[2].signature).toBe("premium-pro:alice.testnet:2026-11-14T17:20:00.000Z:1");
  });
});

describe("mergeNearSettlementEvents", () => {
  it("retains prior DB settlements alongside current subscription cycles without duplicates", () => {
    const live = buildNearPlanEvents(
      [
        {
          id: "pro:alice.testnet",
          wallet: "alice.testnet",
          plan: "pro",
          startedAt: "2026-11-15T10:00:00.000Z",
          lastBilledAt: "2026-11-15T10:01:00.000Z",
          nextDueAt: "2026-11-15T10:02:00.000Z",
          status: "Active",
          network: "near",
          cycleCount: 2,
        },
      ],
      [{ id: "near:pro", name: "pro", priceUsdc: "1.00", intervalSeconds: 60, subscribers: 1, active: true, network: "near" }],
    );

    const priorDb = [
      ...live,
      {
        signature: "pro:alice.testnet:2026-11-14T10:00:00.000Z:1",
        kind: "subscribed" as const,
        label: "New Subscription",
        timestamp: Date.parse("2026-11-14T10:00:00.000Z"),
        timeFormatted: "Nov 14",
        err: false,
        amountGrossUsdc: "1.00",
        amountNetUsdc: "0.995",
        keeperFeeUsdc: "0.00",
        subscriber: "alice.testnet",
        planName: "pro",
        planAddress: "near:pro",
      },
    ];

    const merged = mergeNearSettlementEvents(live, priorDb);
    expect(merged).toHaveLength(3);
    expect(merged[0].timestamp).toBeGreaterThan(merged[2].timestamp);
  });
});
