import { describe, expect, it, vi } from "vitest";
import type { MerchantPlan, SubscriptionRecord } from "@tidepay/sdk-near";
import { fetchNearMerchantData, type NearReader } from "./load";

const NOW = 2_000_000;
const ns = (s: number) => String(BigInt(s) * BigInt(1_000_000_000));
const plan = (id: string): MerchantPlan => ({
  plan_id: id, merchant_id: "m", token_id: "usdc.fakes.testnet", amount: "10000000", interval_seconds: 60,
  protocol_fee_bps: 50, crank_bounty: "50000", is_active: true, created_at_ns: ns(NOW - 10),
});
const sub = (planId: string, who: string): SubscriptionRecord => ({
  plan_id: planId, subscriber_id: who, start_timestamp_ns: ns(NOW - 5), last_epoch_timestamp_ns: ns(NOW - 5),
  next_epoch_timestamp_ns: ns(NOW + 55), cycle_count: 1, is_active: true, deposited_balance: "0",
});

describe("fetchNearMerchantData", () => {
  it("loads each plan's subscribers and maps them", async () => {
    const reader: NearReader = {
      getMerchantPlans: vi.fn(async () => [plan("a"), plan("b")]),
      getPlanSubscribers: vi.fn(async (id: string) => (id === "a" ? [sub("a", "x.testnet")] : [])),
    };
    const data = await fetchNearMerchantData(reader, "acct", NOW);

    expect(reader.getMerchantPlans).toHaveBeenCalledWith("acct");
    expect(reader.getPlanSubscribers).toHaveBeenCalledTimes(2);
    expect(data.plans.map((p) => [p.id, p.subscribers])).toEqual([["near:a", 1], ["near:b", 0]]);
    expect(data.subscribers).toHaveLength(1);
  });

  it("does not query subscribers when the merchant has no plans", async () => {
    const reader: NearReader = { getMerchantPlans: vi.fn(async () => []), getPlanSubscribers: vi.fn() };
    const data = await fetchNearMerchantData(reader, "acct", NOW);
    expect(data.plans).toEqual([]);
    expect(reader.getPlanSubscribers).not.toHaveBeenCalled();
  });

  it("rejects when the chain read fails, so the caller can show a NEAR-only error", async () => {
    const reader: NearReader = { getMerchantPlans: vi.fn().mockRejectedValue(new Error("rpc down")), getPlanSubscribers: vi.fn() };
    await expect(fetchNearMerchantData(reader, "acct", NOW)).rejects.toThrow("rpc down");
  });
});
