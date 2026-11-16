import {
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import type { PublicKey, TransactionInstruction } from "@solana/web3.js";
import type { TxOutcome } from "@tidepay/sdk-near";
import { parseAddress } from "@/lib/chain/accounts";
import { USDC_DECIMALS } from "@/lib/chain/config";
import { formatUsdc, parseUsdc } from "@/lib/chain/derive";

export type WithdrawChain = "near" | "solana";

const NEAR_ACCOUNT_RE = /^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$/;

/** Official NEAR AccountId check: 2-64 chars, lowercase segments or 64-char hex implicit account. */
export function isValidNearAccountId(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length >= 2 && trimmed.length <= 64 && NEAR_ACCOUNT_RE.test(trimmed);
}

/** Plain decimal string without grouping commas so it round-trips through `parseUsdc`. */
export function formatUsdcInput(units: bigint): string {
  return formatUsdc(units).replace(/,/g, "");
}

export type WithdrawValidation =
  | { ok: true; recipient: string; amountUnits: bigint }
  | { ok: false; error: string };

export function validateWithdrawInput(params: {
  chain: WithdrawChain;
  recipient: string;
  amountText: string;
  availableUnits: bigint;
  sourceAddress: string | null;
}): WithdrawValidation {
  const recipient = params.recipient.trim();
  if (!recipient) {
    return {
      ok: false,
      error: params.chain === "near" ? "Enter a destination NEAR account." : "Enter a destination Solana wallet address.",
    };
  }

  if (params.chain === "near") {
    if (!isValidNearAccountId(recipient)) {
      return { ok: false, error: "Enter a valid NEAR account ID (e.g. alice.testnet or 64-char hex)." };
    }
  } else if (!parseAddress(recipient)) {
    return { ok: false, error: "Enter a valid Solana wallet address." };
  }

  if (params.sourceAddress && recipient === params.sourceAddress) {
    return { ok: false, error: "Destination address cannot be the same as the source wallet." };
  }

  const amountUnits = parseUsdc(params.amountText);
  if (amountUnits === null) {
    return { ok: false, error: "Enter a valid USDC amount greater than 0." };
  }

  if (amountUnits > params.availableUnits) {
    return { ok: false, error: "Amount exceeds your available USDC balance." };
  }

  return { ok: true, recipient, amountUnits };
}

/** Creates the recipient ATA if missing and transfers exact-decimal USDC in one transaction. */
export function buildSolanaUsdcWithdrawInstructions(params: {
  owner: PublicKey;
  recipient: PublicKey;
  mint: PublicKey;
  amountUnits: bigint;
}): TransactionInstruction[] {
  const sourceAta = getAssociatedTokenAddressSync(params.mint, params.owner);
  const destAta = getAssociatedTokenAddressSync(params.mint, params.recipient, true);
  return [
    createAssociatedTokenAccountIdempotentInstruction(params.owner, destAta, params.recipient, params.mint),
    createTransferCheckedInstruction(sourceAta, params.mint, destAta, params.owner, params.amountUnits, USDC_DECIMALS),
  ];
}

export function extractNearTxHash(outcome: TxOutcome): string {
  if (typeof outcome.status === "object" && outcome.status !== null && "Failure" in outcome.status) {
    throw new Error("NEAR transfer failed on-chain.");
  }
  return outcome.transaction_outcome?.id ?? outcome.transaction?.hash ?? "";
}
