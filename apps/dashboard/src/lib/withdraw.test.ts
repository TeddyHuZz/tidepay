import { Keypair } from "@solana/web3.js";
import { describe, expect, it } from "vitest";
import {
  buildSolanaUsdcWithdrawInstructions,
  extractNearTxHash,
  formatUsdcInput,
  isValidNearAccountId,
  validateWithdrawInput,
} from "./withdraw";

describe("isValidNearAccountId", () => {
  it("accepts named accounts, subaccounts, and 64-char implicit hex accounts", () => {
    expect(isValidNearAccountId("alice.testnet")).toBe(true);
    expect(isValidNearAccountId("sub_1.bob-2.near")).toBe(true);
    expect(isValidNearAccountId("300dcf03e4337fbece3198a84f07f1eba87393eef7b57faa12a6973feefedaca")).toBe(true);
  });

  it("rejects uppercase, spaces, leading dots, or too-short/long ids", () => {
    expect(isValidNearAccountId("a")).toBe(false);
    expect(isValidNearAccountId("Alice.testnet")).toBe(false);
    expect(isValidNearAccountId(".alice.testnet")).toBe(false);
    expect(isValidNearAccountId("alice..testnet")).toBe(false);
    expect(isValidNearAccountId("a".repeat(65))).toBe(false);
  });
});

describe("validateWithdrawInput", () => {
  it("validates a valid NEAR withdrawal", () => {
    const res = validateWithdrawInput({
      chain: "near",
      recipient: " alice.testnet ",
      amountText: "12.50",
      availableUnits: 20_000_000n,
      sourceAddress: "bob.testnet",
    });
    expect(res).toEqual({ ok: true, recipient: "alice.testnet", amountUnits: 12_500_000n });
  });

  it("rejects self-transfers, invalid addresses, zero amounts, and over-balance amounts", () => {
    const solOwner = Keypair.generate().publicKey.toBase58();
    const solDest = Keypair.generate().publicKey.toBase58();

    expect(
      validateWithdrawInput({
        chain: "solana",
        recipient: solOwner,
        amountText: "1",
        availableUnits: 5_000_000n,
        sourceAddress: solOwner,
      }),
    ).toEqual({ ok: false, error: "Destination address cannot be the same as the source wallet." });

    expect(
      validateWithdrawInput({
        chain: "solana",
        recipient: "not-a-pubkey",
        amountText: "1",
        availableUnits: 5_000_000n,
        sourceAddress: solOwner,
      }),
    ).toEqual({ ok: false, error: "Enter a valid Solana wallet address." });

    expect(
      validateWithdrawInput({
        chain: "solana",
        recipient: solDest,
        amountText: "6",
        availableUnits: 5_000_000n,
        sourceAddress: solOwner,
      }),
    ).toEqual({ ok: false, error: "Amount exceeds your available USDC balance." });

    expect(
      validateWithdrawInput({
        chain: "near",
        recipient: "alice.testnet",
        amountText: "0",
        availableUnits: 5_000_000n,
        sourceAddress: "bob.testnet",
      }),
    ).toEqual({ ok: false, error: "Enter a valid USDC amount greater than 0." });
  });
});

describe("formatUsdcInput", () => {
  it("formats without commas for input round-tripping", () => {
    expect(formatUsdcInput(1_234_500_000n)).toBe("1234.50");
  });
});

describe("buildSolanaUsdcWithdrawInstructions", () => {
  it("builds idempotent ATA creation followed by transfer_checked", () => {
    const owner = Keypair.generate().publicKey;
    const recipient = Keypair.generate().publicKey;
    const mint = Keypair.generate().publicKey;
    const ixs = buildSolanaUsdcWithdrawInstructions({ owner, recipient, mint, amountUnits: 2_500_000n });
    expect(ixs).toHaveLength(2);
    expect(ixs[0].programId.toBase58()).toBe("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
    expect(ixs[1].programId.toBase58()).toBe("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
  });
});

describe("extractNearTxHash", () => {
  it("returns transaction_outcome.id on success and throws on Failure", () => {
    expect(extractNearTxHash({ status: { SuccessValue: "" }, transaction_outcome: { id: "hash123" } } as never)).toBe("hash123");
    expect(() => extractNearTxHash({ status: { Failure: {} }, transaction_outcome: { id: "bad" } } as never)).toThrow();
  });
});
