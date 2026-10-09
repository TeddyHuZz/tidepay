import { afterEach, describe, expect, it, vi } from "vitest";
import {
  Keypair,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { RelayerConfigError, getRelayerKeypair, sponsorTransaction } from "./relayer";

afterEach(() => vi.unstubAllEnvs());

describe("getRelayerKeypair", () => {
  it("is disabled when no key is configured", () => {
    vi.stubEnv("RELAYER_SECRET_KEY", "");
    expect(getRelayerKeypair()).toBeNull();
  });

  it("loads a valid JSON byte array", () => {
    const keypair = Keypair.generate();
    vi.stubEnv("RELAYER_SECRET_KEY", JSON.stringify(Array.from(keypair.secretKey)));
    expect(getRelayerKeypair()?.publicKey.toBase58()).toBe(keypair.publicKey.toBase58());
  });

  it.each(["oops", "[1,2,3]", '["a"]', "[300]"])("rejects malformed key %s", (value) => {
    vi.stubEnv("RELAYER_SECRET_KEY", value);
    expect(() => getRelayerKeypair()).toThrow(RelayerConfigError);
  });
});

describe("sponsorTransaction", () => {
  it("signs as fee payer and leaves the subscriber slot empty", () => {
    const relayer = Keypair.generate();
    const subscriber = Keypair.generate().publicKey;

    const message = new TransactionMessage({
      payerKey: relayer.publicKey,
      recentBlockhash: Keypair.generate().publicKey.toBase58(),
      instructions: [SystemProgram.transfer({ fromPubkey: subscriber, toPubkey: relayer.publicKey, lamports: 0 })],
    }).compileToV0Message();
    const tx = new VersionedTransaction(message);

    sponsorTransaction(tx, relayer);

    expect(tx.signatures).toHaveLength(2);
    expect(tx.signatures[0].some((byte) => byte !== 0)).toBe(true);
    expect(tx.signatures[1].every((byte) => byte === 0)).toBe(true);
  });
});
