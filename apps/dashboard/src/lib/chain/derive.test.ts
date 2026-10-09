import { describe, expect, it } from "vitest";
import {
  deriveMerchantData,
  formatUsdc,
  parseUsdc,
  subscriptionStatus,
  type PlanAccount,
  type SubscriptionAccount,
} from "./derive";

const NOW = 1_800_000_000;

const monthly: PlanAccount = {
  address: "PlanMonthly",
  merchant: "Merchant",
  tokenMint: "Mint",
  merchantTokenAccount: "MerchantAta",
  amount: BigInt(29_000_000),
  intervalSeconds: BigInt(2_592_000),
  planId: "pro",
  protocolFeeBps: 0,
  crankBountyAmount: BigInt(10_000),
  isActive: true,
};

const demo: PlanAccount = { ...monthly, address: "PlanDemo", planId: "demo-60s", amount: BigInt(1_000_000), intervalSeconds: BigInt(60) };

function sub(overrides: Partial<SubscriptionAccount>): SubscriptionAccount {
  return {
    address: "Sub",
    plan: monthly.address,
    subscriber: "Wallet",
    startTimestamp: BigInt(NOW - 100),
    lastEpochTimestamp: BigInt(NOW - 100),
    nextEpochTimestamp: BigInt(NOW + 1_000),
    cycleCount: BigInt(1),
    isActive: true,
    ...overrides,
  };
}

describe("formatUsdc", () => {
  it.each([
    [BigInt(29_000_000), "29.00"],
    [BigInt(1_500_000), "1.50"],
    [BigInt(10_000), "0.01"],
    [BigInt(1), "0.000001"],
    [BigInt(1_234_567_890_000), "1,234,567.89"],
    [BigInt(0), "0.00"],
  ])("formats %s as %s", (amount, expected) => {
    expect(formatUsdc(amount)).toBe(expected);
  });
});

describe("parseUsdc", () => {
  it.each([
    ["29", BigInt(29_000_000)],
    ["29.5", BigInt(29_500_000)],
    ["0.000001", BigInt(1)],
    [" 1.25 ", BigInt(1_250_000)],
  ])("parses %s", (input, expected) => {
    expect(parseUsdc(input)).toBe(expected);
  });

  it.each(["", "0", "0.00", "-1", "1.1234567", "abc", "1e3"])("rejects %s", (input) => {
    expect(parseUsdc(input)).toBeNull();
  });
});

describe("subscriptionStatus", () => {
  it("is active until the grace period after the due epoch", () => {
    expect(subscriptionStatus(sub({ nextEpochTimestamp: BigInt(NOW - 60) }), NOW)).toBe("Active");
  });

  it("is past due once the crank is late beyond the grace period", () => {
    expect(subscriptionStatus(sub({ nextEpochTimestamp: BigInt(NOW - 3_600) }), NOW)).toBe("PastDue");
  });

  it("treats inactive records as cancelled", () => {
    expect(subscriptionStatus(sub({ isActive: false }), NOW)).toBe("Cancelled");
  });
});

describe("deriveMerchantData", () => {
  const subscriptions = [
    sub({ address: "A", subscriber: "W1", cycleCount: BigInt(3), lastEpochTimestamp: BigInt(NOW - 10) }),
    sub({ address: "B", subscriber: "W2", plan: demo.address, nextEpochTimestamp: BigInt(NOW + 30) }),
    sub({ address: "C", subscriber: "W3", nextEpochTimestamp: BigInt(NOW - 3_600), lastEpochTimestamp: BigInt(NOW - 5_000) }),
  ];
  const data = deriveMerchantData([monthly, demo], subscriptions, NOW);

  it("summarises plans with subscriber counts", () => {
    expect(data.plans).toEqual([
      { id: "PlanMonthly", name: "pro", priceUsdc: "29.00", intervalSeconds: 2_592_000, subscribers: 2, active: true },
      { id: "PlanDemo", name: "demo-60s", priceUsdc: "1.00", intervalSeconds: 60, subscribers: 1, active: true },
    ]);
  });

  it("normalises MRR to 30 days over active subscriptions only", () => {
    // pro: 29.00 once; demo: 1.00 every 60s = 43,200.00 per 30 days; C is past due.
    expect(data.metrics[0].value).toBe("43,229.00 USDC");
    expect(data.metrics[1]).toMatchObject({ value: "3", note: "2 active" });
  });

  it("counts successful pulls from cycle counts", () => {
    expect(data.metrics[2].value).toBe("5");
  });

  it("does not invent a crank uptime", () => {
    expect(data.metrics[3].value).toBe("—");
  });

  it("derives statuses and plan names for subscriber rows", () => {
    const byId = Object.fromEntries(data.subscribers.map((row) => [row.id, row]));
    expect(byId.A).toMatchObject({ plan: "pro", status: "Active" });
    expect(byId.C.status).toBe("PastDue");
  });

  it("builds a newest-first activity feed including past-due events", () => {
    expect(data.activity[0]).toMatchObject({ id: "A:last", kind: "settled", amountUsdc: "+29.00" });
    expect(data.activity.map((event) => event.kind)).toContain("subscribed");
    expect(data.activity.find((event) => event.kind === "past_due")?.wallet).toBe("W3");
  });

  it("reports crank status from the earliest due epoch", () => {
    expect(data.crank[1]).toEqual({ label: "Next due", value: "due now" });
    expect(data.crank[2]).toEqual({ label: "Pending epochs", value: "1" });
  });
});
