// Derives a merchant's NEAR key from a signature by their Solana wallet.
// The scheme is fixed: changing the message or the hash would orphan every existing NEAR account.
import { KeyPair, PublicKey, baseEncode, type KeyPairString } from "near-api-js";
import { Keypair } from "@solana/web3.js";

const SIGNATURE_BYTES = 64;

export const NEAR_DERIVE_MESSAGE = (solanaAddress: string) => `TidePay NEAR account v1\n${solanaAddress}`;

export class NearDerivationMismatchError extends Error {
  constructor() {
    super("This wallet now derives a different NEAR account than before. Its signatures are not deterministic, so NEAR plans cannot be used with it.");
    this.name = "NearDerivationMismatchError";
  }
}

/** seed = SHA-256(signature); ed25519 secret = seed || public key, the 64-byte form NEAR expects. */
export async function keyPairFromSignature(signature: Uint8Array): Promise<KeyPair> {
  if (signature.length !== SIGNATURE_BYTES) throw new Error(`Expected a ${SIGNATURE_BYTES}-byte ed25519 signature`);
  const seed = new Uint8Array(await crypto.subtle.digest("SHA-256", signature as BufferSource));
  return KeyPair.fromString(`ed25519:${baseEncode(Keypair.fromSeed(seed).secretKey)}` as KeyPairString);
}

/** Implicit NEAR account id: the 32 public key bytes as lowercase hex. */
export function implicitAccountIdFromPublicKey(publicKey: string): string {
  return Array.from(PublicKey.fromString(publicKey).data, (b) => b.toString(16).padStart(2, "0")).join("");
}

export const implicitAccountId = (keyPair: KeyPair): string => implicitAccountIdFromPublicKey(keyPair.getPublicKey().toString());

/** `stored` is the public key remembered from an earlier derivation for this wallet, or null. */
export function assertStableDerivation(stored: string | null, derivedPublicKey: string): void {
  if (stored !== null && stored !== derivedPublicKey) throw new NearDerivationMismatchError();
}
