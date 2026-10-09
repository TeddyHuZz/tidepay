import { afterEach, describe, expect, it, vi } from "vitest";
import { Connection, Keypair, PublicKey, SystemProgram, TransactionInstruction, VersionedTransaction } from "@solana/web3.js";
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { TIDEPAY_IDL, TIDEPAY_PROGRAM_ID, type MerchantPlan } from "@tidepay/types";
import { SUBSCRIPTION_ACCOUNT_SPACE, buildSubscribeTransaction } from "./build-subscribe-tx";

afterEach(() => vi.unstubAllEnvs());

const programId = new PublicKey(TIDEPAY_PROGRAM_ID);
const subscriber = Keypair.generate().publicKey;
const planPubkey = Keypair.generate().publicKey;
const merchant = Keypair.generate().publicKey;
const relayer = Keypair.generate();

const plan: MerchantPlan = {
  merchant: merchant.toBase58(),
  tokenMint: Keypair.generate().publicKey.toBase58(),
  merchantTokenAccount: Keypair.generate().publicKey.toBase58(),
  amount: BigInt(29_000_000),
  intervalSeconds: BigInt(2_592_000),
  planId: "pro",
  protocolFeeBps: 0,
  crankBountyAmount: BigInt(10_000),
  isActive: true,
  bump: 255,
};

const subscribeIx = new TransactionInstruction({ programId, keys: [], data: Buffer.from([1]) });
const client = {
  findProgramAuthorityPda: () => [Keypair.generate().publicKey, 255] as [PublicKey, number],
  buildSubscribeInstruction: async () => ({ instruction: subscribeIx, subscriptionPda: Keypair.generate().publicKey }),
};

function connectionWith(balance: number) {
  return {
    getBalance: async () => balance,
    getMinimumBalanceForRentExemption: async (size: number) => (size === 0 ? 890_880 : 1_600_000),
    getLatestBlockhash: async () => ({ blockhash: Keypair.generate().publicKey.toBase58() }),
  } as unknown as Connection;
}

function decode(transaction: string) {
  const tx = VersionedTransaction.deserialize(Buffer.from(transaction, "base64"));
  const keys = tx.message.staticAccountKeys;
  return {
    tx,
    payer: keys[0],
    signers: tx.message.header.numRequiredSignatures,
    programs: tx.message.compiledInstructions.map((ix) => keys[ix.programIdIndex]),
  };
}

describe("buildSubscribeTransaction", () => {
  it("builds ATA, approve and subscribe with the subscriber as payer", async () => {
    const { transaction, sponsored } = await buildSubscribeTransaction({
      connection: connectionWith(0),
      client,
      planPubkey,
      plan,
      subscriber,
      relayer: null,
    });
    const { tx, payer, signers, programs } = decode(transaction);

    expect(sponsored).toBe(false);
    expect(tx.version).toBe(0);
    expect(payer.equals(subscriber)).toBe(true);
    expect(signers).toBe(1);
    expect(programs.map((p) => p.toBase58())).toEqual([
      ASSOCIATED_TOKEN_PROGRAM_ID.toBase58(),
      TOKEN_PROGRAM_ID.toBase58(),
      programId.toBase58(),
    ]);
  });

  it("does not sponsor when the merchant is not on the allowlist", async () => {
    vi.stubEnv("RELAYER_ALLOWED_MERCHANTS", Keypair.generate().publicKey.toBase58());
    const { transaction, sponsored } = await buildSubscribeTransaction({
      connection: connectionWith(0),
      client,
      planPubkey,
      plan,
      subscriber,
      relayer,
    });

    expect(sponsored).toBe(false);
    expect(decode(transaction).payer.equals(subscriber)).toBe(true);
  });

  it("sponsors an allowlisted merchant: relayer pays, tops up SOL and signs first", async () => {
    vi.stubEnv("RELAYER_ALLOWED_MERCHANTS", merchant.toBase58());
    const { transaction, sponsored } = await buildSubscribeTransaction({
      connection: connectionWith(0),
      client,
      planPubkey,
      plan,
      subscriber,
      relayer,
    });
    const { tx, payer, signers, programs } = decode(transaction);

    expect(sponsored).toBe(true);
    expect(payer.equals(relayer.publicKey)).toBe(true);
    expect(signers).toBe(2);
    expect(tx.signatures[0].some((byte) => byte !== 0)).toBe(true);
    expect(tx.signatures[1].every((byte) => byte === 0)).toBe(true);
    expect(programs[0].toBase58()).toBe(SystemProgram.programId.toBase58());

    const transfer = tx.message.compiledInstructions[0];
    expect(Buffer.from(transfer.data).readBigUInt64LE(4)).toBe(BigInt(2_490_880));
  });

  it("skips the SOL top-up when the subscriber already has enough", async () => {
    vi.stubEnv("RELAYER_ALLOWED_MERCHANTS", merchant.toBase58());
    const { transaction } = await buildSubscribeTransaction({
      connection: connectionWith(10_000_000),
      client,
      planPubkey,
      plan,
      subscriber,
      relayer,
    });

    expect(decode(transaction).programs.map((p) => p.toBase58())).not.toContain(SystemProgram.programId.toBase58());
  });
});

describe("SUBSCRIPTION_ACCOUNT_SPACE", () => {
  const FIELD_BYTES: Record<string, number> = { pubkey: 32, i64: 8, u64: 8, bool: 1, u8: 1 };
  const DISCRIMINATOR_BYTES = 8;

  it("matches the on-chain SubscriptionRecord layout in the IDL", () => {
    const typeDef = TIDEPAY_IDL.types.find((type) => type.name === "SubscriptionRecord");
    expect(typeDef).toBeDefined();

    const fields = typeDef?.type.fields ?? [];
    const dataBytes = fields.reduce((total, field) => {
      const bytes = FIELD_BYTES[String(field.type)];
      expect(bytes, `unknown field type for ${field.name}`).toBeDefined();
      return total + bytes;
    }, 0);

    expect(DISCRIMINATOR_BYTES + dataBytes).toBe(SUBSCRIPTION_ACCOUNT_SPACE);
  });
});
