import {
  Connection,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
  clusterApiUrl,
} from "@solana/web3.js";
import type { PlanSummary } from "@/lib/mock-data";

const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

export class SubscribeTxUnavailableError extends Error {}

export interface BuiltSubscribeTx {
  /** Base64-encoded serialized v0 transaction. */
  transaction: string;
  message: string;
}

/**
 * Builds the unsigned subscribe transaction for a wallet.
 *
 * The real implementation will come from `@tidepay/sdk` (`buildSubscribeIx`),
 * which still throws "Not implemented". Until then this fails explicitly,
 * unless TIDEPAY_ACTIONS_MOCK_TX=1 opts into a Memo-only transaction that
 * lets the Blink flow be exercised in dial.to. The mock moves no funds and
 * creates no subscription.
 */
export async function buildSubscribeTransaction(
  plan: PlanSummary,
  subscriber: PublicKey,
): Promise<BuiltSubscribeTx> {
  if (process.env.TIDEPAY_ACTIONS_MOCK_TX !== "1") {
    throw new SubscribeTxUnavailableError(
      "Subscriptions are not available yet: the on-chain program is still being integrated.",
    );
  }

  const connection = new Connection(
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? clusterApiUrl("devnet"),
    "confirmed",
  );
  const { blockhash } = await connection.getLatestBlockhash();

  const memo = new TransactionInstruction({
    programId: MEMO_PROGRAM_ID,
    keys: [{ pubkey: subscriber, isSigner: true, isWritable: false }],
    data: Buffer.from(`tidepay:mock-subscribe:${plan.id}`, "utf8"),
  });

  const message = new TransactionMessage({
    payerKey: subscriber,
    recentBlockhash: blockhash,
    instructions: [memo],
  }).compileToV0Message();

  const transaction = Buffer.from(new VersionedTransaction(message).serialize()).toString("base64");

  return {
    transaction,
    message: `Test transaction for ${plan.name}. No funds move and no subscription is created.`,
  };
}
