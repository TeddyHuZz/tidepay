import idlJson from "./idl.json";

export const TIDEPAY_IDL = idlJson;
export const TIDEPAY_PROGRAM_ID = "DfAycPzXuSu4EzqfAprZ11S8oQZ6nucuRniFNrNaK5CQ";

export const PLAN_SEED = "plan";
export const SUBSCRIPTION_SEED = "subscription";
export const AUTH_SEED = "tidepay_auth";

export interface MerchantPlan {
  merchant: string;
  tokenMint: string;
  merchantTokenAccount: string;
  amount: bigint;
  intervalSeconds: bigint;
  planId: string;
  protocolFeeBps: number;
  crankBountyAmount: bigint;
  isActive: boolean;
  bump: number;
}

export interface SubscriptionRecord {
  plan: string;
  subscriber: string;
  subscriberTokenAccount: string;
  startTimestamp: bigint;
  lastEpochTimestamp: bigint;
  nextEpochTimestamp: bigint;
  cycleCount: bigint;
  isActive: boolean;
  bump: number;
}