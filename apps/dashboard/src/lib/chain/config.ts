import { PublicKey, clusterApiUrl } from "@solana/web3.js";

export const DEVNET_RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL?.trim() ||
  process.env.NEXT_PUBLIC_SOLANA_FALLBACK_RPC_URL?.trim() ||
  clusterApiUrl("devnet");

export const MAINNET_RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_MAINNET_RPC_URL?.trim() ||
  (process.env.NEXT_PUBLIC_SOLANA_RPC_URL?.includes("devnet.helius-rpc.com")
    ? process.env.NEXT_PUBLIC_SOLANA_RPC_URL.replace("devnet.helius-rpc.com", "mainnet.helius-rpc.com")
    : clusterApiUrl("mainnet-beta"));

export function getRpcUrl(environment: "sandbox" | "live" = "sandbox"): string {
  return environment === "live" ? MAINNET_RPC_URL : DEVNET_RPC_URL;
}

export function getCluster(environment: "sandbox" | "live" = "sandbox"): "mainnet-beta" | "devnet" {
  return environment === "live" ? "mainnet-beta" : "devnet";
}

export const PRIMARY_RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL?.trim() || "";
export const FALLBACK_RPC_URL = process.env.NEXT_PUBLIC_SOLANA_FALLBACK_RPC_URL?.trim() || clusterApiUrl("devnet");
export const RPC_URL = PRIMARY_RPC_URL || FALLBACK_RPC_URL;

/** Devnet USDC (Circle) vs Mainnet USDC (Circle) */
export const DEVNET_USDC_MINT = new PublicKey(
  process.env.NEXT_PUBLIC_USDC_MINT || "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
);
export const MAINNET_USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

export function getUsdcMint(environment: "sandbox" | "live" = "sandbox"): PublicKey {
  return environment === "live" ? MAINNET_USDC_MINT : DEVNET_USDC_MINT;
}

export const USDC_MINT = DEVNET_USDC_MINT;
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
export const DEFAULT_CRANK_BOUNTY_USDC = "0.05";

/** process_epoch does not charge a protocol fee yet; keep plans at 0 bps. */
export const PROTOCOL_FEE_BPS = 0;

export function explorerUrl(kind: "address" | "tx", value: string, environment: "sandbox" | "live" = "sandbox") {
  const cluster = getCluster(environment);
  return cluster === "mainnet-beta"
    ? `https://explorer.solana.com/${kind}/${value}`
    : `https://explorer.solana.com/${kind}/${value}?cluster=devnet`;
}

export function blinkUrl(planAddress: string, environment: "sandbox" | "live" = "sandbox") {
  const cluster = getCluster(environment);
  const actionUrl = `${API_URL}/api/actions/subscribe/${planAddress}`;
  return cluster === "mainnet-beta"
    ? `https://dial.to/?action=solana-action:${encodeURIComponent(actionUrl)}`
    : `https://dial.to/?action=solana-action:${encodeURIComponent(actionUrl)}&cluster=devnet`;
}

export function checkoutUrl(planAddress: string) {
  return `${APP_URL}/checkout/${planAddress}`;
}

