import { describe, expect, it } from "vitest";
import { PublicKey } from "@solana/web3.js";
import { TIDEPAY_PROGRAM_ID } from "@tidepay/types";
import { isPlanAccount } from "./plan-account";

const PROGRAM = new PublicKey(TIDEPAY_PROGRAM_ID);
const PLAN_DISCRIMINATOR = [186, 54, 183, 129, 39, 81, 74, 89];
const SUBSCRIPTION_DISCRIMINATOR = [76, 229, 85, 224, 137, 37, 156, 88];

function account(owner: PublicKey, bytes: number[]) {
  return { owner, data: Uint8Array.from([...bytes, 0, 0, 0]) };
}

describe("isPlanAccount", () => {
  it("accepts a program-owned MerchantPlan", () => {
    expect(isPlanAccount(account(PROGRAM, PLAN_DISCRIMINATOR))).toBe(true);
  });

  it("rejects a missing account", () => {
    expect(isPlanAccount(null)).toBe(false);
  });

  it("rejects another account type", () => {
    expect(isPlanAccount(account(PROGRAM, SUBSCRIPTION_DISCRIMINATOR))).toBe(false);
  });

  it("rejects an account owned by another program", () => {
    expect(isPlanAccount(account(PublicKey.default, PLAN_DISCRIMINATOR))).toBe(false);
  });

  it("rejects data shorter than the discriminator", () => {
    expect(isPlanAccount({ owner: PROGRAM, data: Uint8Array.from([186, 54]) })).toBe(false);
  });
});
