import { describe, it, expect, vi } from "vitest";
import type { Account } from "near-api-js";
import { TidePayNearClient } from "../src/client.js";

const mockAccount = () => {
  const callFunction = vi.fn().mockResolvedValue("ok");
  const view = vi.fn().mockResolvedValue(null);
  const account = { callFunction, provider: { callFunction: view } } as unknown as Account;
  return { account, callFunction, view };
};

describe("TidePayNearClient", () => {
  it("formats createPlan args with defaults", async () => {
    const { account, callFunction } = mockAccount();
    await new TidePayNearClient(account, "tidepay.testnet").createPlan({
      planId: "starter-monthly",
      tokenId: "usdc.testnet",
      amount: 15_000_000n,
      intervalSeconds: 86400,
    });

    expect(callFunction).toHaveBeenCalledWith({
      contractId: "tidepay.testnet",
      methodName: "create_plan",
      args: {
        plan_id: "starter-monthly",
        token_id: "usdc.testnet",
        amount: "15000000",
        interval_seconds: 86400,
        crank_bounty: "50000",
        protocol_fee_bps: 50,
      },
      gas: 30_000_000_000_000n,
    });
  });

  it("subscribe sends ft_transfer_call to the token with 1 yocto and a subscribe msg", async () => {
    const { account, callFunction } = mockAccount();
    await new TidePayNearClient(account, "tidepay.testnet").subscribe({
      planId: "p1",
      tokenId: "usdc.testnet",
      depositAmount: 50n,
    });

    const call = callFunction.mock.calls[0][0];
    expect(call.contractId).toBe("usdc.testnet");
    expect(call.methodName).toBe("ft_transfer_call");
    expect(call.deposit).toBe(1n);
    expect(call.args.receiver_id).toBe("tidepay.testnet");
    expect(JSON.parse(call.args.msg)).toEqual({ action: "subscribe", plan_id: "p1" });
  });

  it("deposit uses the deposit action", async () => {
    const { account, callFunction } = mockAccount();
    await new TidePayNearClient(account, "tidepay.testnet").deposit({ planId: "p1", tokenId: "usdc.testnet", amount: 5n });
    expect(JSON.parse(callFunction.mock.calls[0][0].args.msg).action).toBe("deposit");
  });

  it("views go through the provider and normalise empty results to null/false", async () => {
    const { account, view } = mockAccount();
    const client = new TidePayNearClient(account, "tidepay.testnet");
    expect(await client.getPlan("nope")).toBeNull();
    expect(await client.isSubscriptionDue("nope", "a.testnet")).toBe(false);
    expect(view).toHaveBeenCalledWith({ contractId: "tidepay.testnet", method: "get_plan", args: { plan_id: "nope" } });
  });
});
