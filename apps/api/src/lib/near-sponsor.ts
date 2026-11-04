// Tops up new embedded NEAR accounts with a little testnet NEAR so they can pay for gas.
// The sponsor key only ever holds gas money; it never touches merchant keys.
import { Account, JsonRpcProvider, KeyPairSigner, type KeyPairString } from "near-api-js";

/** Accounts below this balance (0.1 NEAR) get topped up. */
export const MIN_MERCHANT_NEAR_YOCTO = 10n ** 23n;
/** Amount sent per top-up (0.5 NEAR). */
export const SPONSOR_AMOUNT_YOCTO = 5n * 10n ** 23n;

const IMPLICIT_ID_RE = /^[0-9a-f]{64}$/;

export interface SponsorConfig {
  networkId: string;
}

export interface SponsorDeps {
  getBalance: (accountId: string) => Promise<bigint>;
  /** Sends `amountYocto` NEAR and returns the transaction hash. */
  transfer: (accountId: string, amountYocto: bigint) => Promise<string>;
}

export interface SponsorResult {
  status: number;
  body: Record<string, unknown>;
}

export const isImplicitAccountId = (id: string) => IMPLICIT_ID_RE.test(id);

export const sponsorAmount = (balanceYocto: bigint) => (balanceYocto < MIN_MERCHANT_NEAR_YOCTO ? SPONSOR_AMOUNT_YOCTO : 0n);

export async function handleSponsor(input: unknown, config: SponsorConfig | null, deps: SponsorDeps): Promise<SponsorResult> {
  if (!config || config.networkId === "mainnet") return { status: 503, body: { error: "Sponsorship is not available on this network" } };

  const accountId = (input as { accountId?: unknown } | null)?.accountId;
  if (typeof accountId !== "string" || !isImplicitAccountId(accountId)) {
    return { status: 400, body: { error: "accountId must be a 64-character lowercase hex implicit account id" } };
  }

  try {
    const balance = await deps.getBalance(accountId);
    const amount = sponsorAmount(balance);
    if (amount === 0n) return { status: 200, body: { funded: false, balanceYocto: balance.toString() } };
    const txHash = await deps.transfer(accountId, amount);
    return { status: 200, body: { funded: true, balanceYocto: balance.toString(), txHash } };
  } catch (error) {
    console.error("[TidePay] NEAR sponsor failed:", error);
    return { status: 502, body: { error: "Could not fund the account right now" } };
  }
}

/** Builds the real dependencies from env, or null when sponsorship is not configured. */
export function sponsorFromEnv(env: NodeJS.ProcessEnv = process.env): { config: SponsorConfig; deps: SponsorDeps } | null {
  const sponsorId = env.NEAR_SPONSOR_ACCOUNT_ID;
  const key = env.NEAR_SPONSOR_PRIVATE_KEY;
  if (!sponsorId || !key) return null;

  const networkId = env.NEAR_NETWORK_ID ?? "testnet";
  const provider = new JsonRpcProvider({ url: env.NEAR_RPC_URL ?? "https://test.rpc.fastnear.com" });
  const sponsor = new Account(sponsorId, provider, KeyPairSigner.fromSecretKey(key as KeyPairString));

  return {
    config: { networkId },
    deps: {
      // An account that does not exist yet has no balance.
      getBalance: async (accountId) => {
        try {
          return BigInt((await provider.viewAccount({ accountId })).amount);
        } catch (error) {
          if (String(error).includes("does not exist")) return 0n;
          throw error;
        }
      },
      transfer: async (accountId, amountYocto) => {
        const outcome = await sponsor.transfer({ receiverId: accountId, amount: amountYocto });
        return outcome.transaction_outcome.id;
      },
    },
  };
}
