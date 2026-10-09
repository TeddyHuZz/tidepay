import { PublicKey, clusterApiUrl } from "@solana/web3.js";

export const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl("devnet");

/** Devnet USDC (Circle). Override for a custom test mint. */
export const USDC_MINT = new PublicKey(
  process.env.NEXT_PUBLIC_USDC_MINT || "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
);
export const USDC_DECIMALS = 6;

export const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001").replace(/\/$/, "");

/** Serve sample data instead of reading the chain (UI demos before deploy). */
export const USE_SAMPLE_DATA = process.env.NEXT_PUBLIC_USE_SAMPLE_DATA === "1";

/** Plan the /demo app checks for an active subscription. */
export const DEMO_PLAN_ADDRESS = process.env.NEXT_PUBLIC_DEMO_PLAN_ADDRESS?.trim() || null;

/** Billing is past due once the crank is this late on an epoch. */
export const PAST_DUE_GRACE_SECONDS = 120;

/** Crank reward per epoch, deducted from the merchant's share. */
export const DEFAULT_CRANK_BOUNTY_USDC = "0.01";

/** process_epoch does not charge a protocol fee yet; keep plans at 0 bps. */
export const PROTOCOL_FEE_BPS = 0;

export function explorerUrl(kind: "address" | "tx", value: string) {
  return `https://explorer.solana.com/${kind}/${value}?cluster=devnet`;
}

export function blinkUrl(planAddress: string) {
  const actionUrl = `${API_URL}/api/actions/subscribe/${planAddress}`;
  return `https://dial.to/?action=solana-action:${encodeURIComponent(actionUrl)}&cluster=devnet`;
}

export function checkoutUrl(planAddress: string) {
  return `${APP_URL}/checkout/${planAddress}`;
}
