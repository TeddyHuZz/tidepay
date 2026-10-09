import { Keypair, PublicKey, SystemProgram, type TransactionInstruction, type VersionedTransaction } from "@solana/web3.js";

export class RelayerConfigError extends Error {}

/**
 * Fee-payer relayer for gasless onboarding (server-only).
 *
 * The relayer only ever signs transactions this server built itself, and only
 * for plans whose merchant is on the allowlist. There is deliberately no
 * endpoint that signs client-supplied transactions.
 */
export function getRelayerKeypair(): Keypair | null {
  const raw = process.env.RELAYER_SECRET_KEY?.trim();
  if (!raw) return null;

  try {
    const bytes = JSON.parse(raw) as unknown;
    if (!Array.isArray(bytes) || !bytes.every((b) => Number.isInteger(b) && b >= 0 && b <= 255)) {
      throw new Error("not a byte array");
    }
    return Keypair.fromSecretKey(Uint8Array.from(bytes as number[]));
  } catch {
    throw new RelayerConfigError("RELAYER_SECRET_KEY must be a JSON array of 64 bytes.");
  }
}

/**
 * Sponsorship is opt-in per merchant. Without an allowlist anyone could create
 * a cheap plan and drain the relayer through repeated subscribe/cancel cycles.
 */
export function isMerchantSponsored(merchant: PublicKey): boolean {
  const allowed = (process.env.RELAYER_ALLOWED_MERCHANTS ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return allowed.includes(merchant.toBase58());
}

/**
 * Lamports the subscriber needs so the program can create the subscription
 * account (`payer = subscriber`) and the wallet still holds a rent-exempt
 * balance afterwards. Returns 0 when the wallet already has enough.
 */
export function topUpLamports(params: {
  subscriberBalance: number;
  subscriptionRent: number;
  systemAccountMinimum: number;
}): number {
  const required = params.subscriptionRent + params.systemAccountMinimum;
  return Math.max(0, required - params.subscriberBalance);
}

export function createTopUpInstruction(relayer: PublicKey, subscriber: PublicKey, lamports: number): TransactionInstruction {
  return SystemProgram.transfer({ fromPubkey: relayer, toPubkey: subscriber, lamports });
}

/** Adds the relayer's fee-payer signature, leaving other signatures empty. */
export function sponsorTransaction(tx: VersionedTransaction, relayer: Keypair) {
  tx.sign([relayer]);
}
