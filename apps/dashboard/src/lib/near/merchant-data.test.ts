import { describe, expect, it } from "vitest";
import type { MerchantPlan, SubscriptionRecord } from "@tidepay/sdk-near";
import type { MerchantData } from "@/lib/types";
import { deriveNearMerchantData, mergeMerchantData } from "./merchant-data";

const NOW = 1_000_000; // seconds
const ns = (seconds: number) => String(BigInt(seconds) * BigInt(1_000_000_000));

const plan = (over: Partial<MerchantPlan> = {}): MerchantPlan => ({
  plan_id: "pro",
  merchant_id: "m",
  token_id: "usdc.fakes.testnet",
  amount: "10000000", // 10 USDC
  interval_seconds: 2_592_000, // 30 days
  protocol_fee_bps: 50,
  crank_bounty: "50000",
  is_active: true,
  created_at_ns: ns(NOW - 500),
  ...over,
});

const sub = (over: Partial<SubscriptionRecord> = {}): SubscriptionRecord => ({
  plan_id: "pro",
  subscriber_id: "alice.testnet",
  start_timestamp_ns: ns(NOW - 100),
  last_epoch_timestamp_ns: ns(NOW - 100),
  next_epoch_timestamp_ns: ns(NOW + 1000),
  cycle_count: 1,
  is_active: true,
  deposited_balance: "20000000",
  ...over,
});

describe("deriveNearMerchantData", () => {
  it("maps an active plan with one subscriber", () => {
    const data = deriveNearMerchantData([plan()], { pro: [sub()] }, NOW);

    expect(data.plans).toEqual([
      { id: "near:pro", name: "pro", priceUsdc: "10.00", intervalSeconds: 2_592_000, subscribers: 1, active: true, network: "near" },
    ]);
    expect(data.subscribers).toHaveLength(1);
    expect(data.subscribers[0]).toMatchObject({ wallet: "alice.testnet", plan: "pro", status: "Active", network: "near", cycleCount: 1 });
    expect(data.metrics.find((m) => m.label === "Active MRR")?.value).toBe("10.00 USDC");
    expect(data.metrics.find((m) => m.label === "Total subscribers")?.value).toBe("1");
  });

  it("marks cancelled subscribers and excludes them from MRR", () => {
    const data = deriveNearMerchantData([plan()], { pro: [sub({ is_active: false })] }, NOW);
    expect(data.subscribers[0].status).toBe("Cancelled");
    expect(data.metrics.find((m) => m.label === "Active MRR")?.value).toBe("0.00 USDC");
  });

  it("marks a subscriber overdue past the grace period as PastDue", () => {
    const data = deriveNearMerchantData([plan()], { pro: [sub({ next_epoch_timestamp_ns: ns(NOW - 500) })] }, NOW);
    expect(data.subscribers[0].status).toBe("PastDue");
    expect(data.activity.some((a) => a.kind === "past_due")).toBe(true);
  });

  it("handles a plan with no subscribers", () => {
    const data = deriveNearMerchantData([plan()], {}, NOW);
    expect(data.plans[0].subscribers).toBe(0);
    expect(data.subscribers).toEqual([]);
  });
});

const solanaData = (over: Partial<MerchantData> = {}): MerchantData => ({
  plans: [{ id: "SoLAddr", name: "sol-plan", priceUsdc: "5.00", intervalSeconds: 60, subscribers: 2, active: true }],
  subscribers: [{ id: "s1", wallet: "w", plan: "sol-plan", lastBilledAt: "2026-01-01T00:00:00.000Z", nextDueAt: "2026-01-02T00:00:00.000Z", status: "Active" }],
  metrics: [
    { label: "Active MRR", value: "20.00 USDC", note: "n" },
    { label: "Total subscribers", value: "2", note: "1 active" },
    { label: "Successful pulls", value: "7", note: "p" },
    { label: "Crank uptime", value: "—", note: "c" },
  ],
  activity: [],
  crank: [{ label: "Last pull", value: "—" }],
  ...over,
});

describe("mergeMerchantData", () => {
  it("returns the Solana data unchanged when NEAR is unavailable", () => {
    const s = solanaData();
    expect(mergeMerchantData(s, null)).toBe(s);
  });

  it("concatenates lists and sums the numeric metrics", () => {
    const near = deriveNearMerchantData([plan()], { pro: [sub({ cycle_count: 3 })] }, NOW);
    const merged = mergeMerchantData(solanaData(), near);

    expect(merged.plans.map((p) => p.id)).toEqual(["SoLAddr", "near:pro"]);
    expect(merged.subscribers).toHaveLength(2);
    const metric = (label: string) => merged.metrics.find((m) => m.label === label);
    expect(metric("Active MRR")?.value).toBe("30.00 USDC");
    expect(metric("Total subscribers")?.value).toBe("3");
    expect(metric("Successful pulls")?.value).toBe("10");
    expect(metric("Total subscribers")?.note).toBe("2 active");
    expect(merged.crank).toEqual(solanaData().crank);
  });

  it("keeps NEAR plans when the Solana side is an empty workspace with different metric labels", () => {
    const empty = solanaData({
      plans: [],
      subscribers: [],
      metrics: [{ label: "Total Earned (Net)", value: "0.00 USDC", note: "x" }],
    });
    const near = deriveNearMerchantData([plan()], { pro: [sub()] }, NOW);
    const merged = mergeMerchantData(empty, near);

    expect(merged.plans.map((p) => p.id)).toEqual(["near:pro"]);
    expect(merged.metrics.some((m) => m.label === "Active MRR")).toBe(true);
  });
});
