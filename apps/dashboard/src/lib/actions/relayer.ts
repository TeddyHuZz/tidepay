import { Keypair, type VersionedTransaction } from "@solana/web3.js";

export class RelayerConfigError extends Error {}

/**
 * Fee-payer relayer for gasless onboarding (server-only).
 *
 * The relayer only ever signs transactions this server built itself, as the
 * fee payer. There is deliberately no endpoint that signs client-supplied
 * transactions.
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

/** Adds the relayer's fee-payer signature, leaving other signatures empty. */
export function sponsorTransaction(tx: VersionedTransaction, relayer: Keypair) {
  tx.sign([relayer]);
}
