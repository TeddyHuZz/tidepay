// NEAR Testnet settings for the dashboard. Defaults match the contract deployed by scripts/deploy-near-contract.sh.

export const NEAR_NETWORK_ID = "testnet";
export const NEAR_RPC_URL = process.env.NEXT_PUBLIC_NEAR_RPC_URL?.trim() || "https://test.rpc.fastnear.com";
export const NEAR_CONTRACT_ID =
  process.env.NEXT_PUBLIC_TIDEPAY_NEAR_CONTRACT?.trim() || "tidepay-mw1rpoyp.tidepay-e2e-mw1rpm6j.testnet";

/** Demo token with an open `mint`, 6 decimals (same as USDC). */
export const NEAR_USDC_TOKEN_ID = "usdc.fakes.testnet";

/** Matches the contract's default protocol fee (0.5%). */
export const NEAR_PROTOCOL_FEE_BPS = 50;

/** Merchant accounts below this (0.1 NEAR) are topped up by the sponsor route. */
export const MIN_MERCHANT_NEAR_YOCTO = BigInt(10) ** BigInt(23);

export function nearExplorerUrl(kind: "address" | "tx", value: string): string {
  return `https://testnet.nearblocks.io/${kind === "tx" ? "txns" : "address"}/${value}`;
}
