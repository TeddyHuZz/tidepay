import { describe, expect, it } from "vitest";
import { buildNearCreatePlanParams, nearNetPayout, nearPriceTooLow } from "./plan-args";

describe("buildNearCreatePlanParams", () => {
  it("fills token, renewal fee and protocol fee from constants", () => {
    expect(buildNearCreatePlanParams({ planId: "pro", amount: 10_000_000n, intervalSeconds: 60 })).toEqual({
      planId: "pro",
      tokenId: "usdc.fakes.testnet",
      amount: 10_000_000n,
      intervalSeconds: 60,
      crankBounty: 50_000n,
      protocolFeeBps: 50,
    });
  });
});

describe("nearPriceTooLow", () => {
  it("is true when fee plus bounty would consume the whole price", () => {
    // 100 units: fee floors to 0, bounty 100 -> merchant gets nothing
    expect(nearPriceTooLow(100n, 100n, 50)).toBe(true);
    expect(nearPriceTooLow(1_000_000n, 50_000n, 50)).toBe(false); // 1 USDC
    expect(nearPriceTooLow(50_000n, 50_000n, 50)).toBe(true);
    expect(nearPriceTooLow(50_001n, 50_000n, 50)).toBe(true); // fee 250 + bounty 50_000 exceeds the price: the contract would reject it
    expect(nearPriceTooLow(60_000n, 50_000n, 50)).toBe(false); // fee 300 + bounty 50_000 leaves 9_700 for the merchant
  });
});

describe("nearNetPayout", () => {
  it("subtracts the protocol fee and the renewal fee from the price", () => {
    // 10 USDC: fee 0.05, bounty 0.05 -> 9.90
    expect(nearNetPayout(10_000_000n, 50_000n, 50)).toBe(9_900_000n);
  });
});
