import type { TidePayNearClient } from "@tidepay/sdk-near";
import { DEFAULT_CRANK_BOUNTY_USDC } from "@/lib/chain/config";
import { parseUsdc } from "@/lib/chain/derive";
import { NEAR_PROTOCOL_FEE_BPS, NEAR_USDC_TOKEN_ID } from "./config";

const BPS_DENOMINATOR = BigInt(10_000);

/** The per-renewal keeper reward, in token units. */
export const NEAR_CRANK_BOUNTY = parseUsdc(DEFAULT_CRANK_BOUNTY_USDC) ?? BigInt(0);

const feeOf = (amount: bigint, feeBps: number) => (amount * BigInt(feeBps)) / BPS_DENOMINATOR;

export function buildNearCreatePlanParams(input: { planId: string; amount: bigint; intervalSeconds: number }): Parameters<TidePayNearClient["createPlan"]>[0] {
  return { ...input, tokenId: NEAR_USDC_TOKEN_ID, crankBounty: NEAR_CRANK_BOUNTY, protocolFeeBps: NEAR_PROTOCOL_FEE_BPS };
}

/** Mirrors the contract's ERR_INVALID_BOUNTY check, plus a price that leaves the merchant nothing. */
export function nearPriceTooLow(amount: bigint, bounty: bigint = NEAR_CRANK_BOUNTY, feeBps: number = NEAR_PROTOCOL_FEE_BPS): boolean {
  return feeOf(amount, feeBps) + bounty >= amount;
}

/** What the merchant receives per cycle. */
export function nearNetPayout(amount: bigint, bounty: bigint = NEAR_CRANK_BOUNTY, feeBps: number = NEAR_PROTOCOL_FEE_BPS): bigint {
  return amount - feeOf(amount, feeBps) - bounty;
}
