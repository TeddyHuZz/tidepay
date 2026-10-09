import { afterEach, describe, expect, it, vi } from "vitest";
import {
  Keypair,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  RelayerConfigError,
  getRelayerKeypair,
  isMerchantSponsored,
  sponsorTransaction,
  topUpLamports,
} from "./relayer";

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

describe("isMerchantSponsored", () => {
  const merchant = Keypair.generate().publicKey;
  const other = Keypair.generate().publicKey;

  it("sponsors nobody by default", () => {
    vi.stubEnv("RELAYER_ALLOWED_MERCHANTS", "");
    expect(isMerchantSponsored(merchant)).toBe(false);
  });

  it("sponsors only listed merchants, tolerating whitespace", () => {
    vi.stubEnv("RELAYER_ALLOWED_MERCHANTS", ` ${other.toBase58()} , ${merchant.toBase58()} `);
    expect(isMerchantSponsored(merchant)).toBe(true);
    expect(isMerchantSponsored(Keypair.generate().publicKey)).toBe(false);
  });
});

describe("topUpLamports", () => {
  const costs = { subscriptionRent: 1_600_000, systemAccountMinimum: 890_880 };

  it("tops up an empty wallet to cover rent and a rent-exempt remainder", () => {
    expect(topUpLamports({ subscriberBalance: 0, ...costs })).toBe(2_490_880);
  });

  it("only tops up the shortfall", () => {
    expect(topUpLamports({ subscriberBalance: 1_000_000, ...costs })).toBe(1_490_880);
  });

  it("adds nothing when the wallet already has enough", () => {
    expect(topUpLamports({ subscriberBalance: 5_000_000, ...costs })).toBe(0);
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
