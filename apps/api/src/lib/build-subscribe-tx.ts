import {
  Connection,
  Keypair,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
  type TransactionInstruction,
} from "@solana/web3.js";
import {
  createApproveInstruction,
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import type { TidePayClient } from "@tidepay/sdk";
import type { MerchantPlan } from "@tidepay/types";
import { createTopUpInstruction, isMerchantSponsored, sponsorTransaction, topUpLamports } from "./relayer";

/** 8-byte discriminator + SubscriptionRecord::INIT_SPACE (130). */
export const SUBSCRIPTION_ACCOUNT_SPACE = 138;

/** Allowance ceiling, in billing cycles, delegated to the program authority. */
export const ALLOWANCE_CYCLES = BigInt(12);

type SubscribeClient = Pick<TidePayClient, "findProgramAuthorityPda" | "buildSubscribeInstruction">;

export interface SubscribeTxParams {
  connection: Connection;
  client: SubscribeClient;
  planPubkey: PublicKey;
  plan: MerchantPlan;
  subscriber: PublicKey;
  relayer: Keypair | null;
}

export interface SubscribeTx {
  /** Base64-encoded serialized v0 transaction. */
  transaction: string;
  /** True when the relayer pays fees and covers the subscriber's rent. */
  sponsored: boolean;
}

/**
 * Builds the unsigned subscribe transaction: ensure the subscriber's token
 * account exists, delegate an allowance to the program authority PDA, then
 * subscribe (which pulls epoch 0).
 *
 * When the plan's merchant is on the relayer allowlist the relayer pays the
 * network fee and the token-account rent, and tops up the subscriber's SOL so
 * the program can create their subscription account. That lets a wallet holding
 * USDC but no SOL subscribe.
 */
export async function buildSubscribeTransaction(params: SubscribeTxParams): Promise<SubscribeTx> {
  const { connection, client, planPubkey, plan, subscriber, relayer } = params;

  const tokenMint = new PublicKey(plan.tokenMint);
  const merchantTokenAccount = new PublicKey(plan.merchantTokenAccount);
  const [programAuthority] = client.findProgramAuthorityPda();
  const subscriberAta = getAssociatedTokenAddressSync(tokenMint, subscriber);

  const sponsoringRelayer = relayer && isMerchantSponsored(new PublicKey(plan.merchant)) ? relayer : null;
  const feePayer = sponsoringRelayer?.publicKey ?? subscriber;

  const instructions: TransactionInstruction[] = [];

  if (sponsoringRelayer) {
    const [subscriberBalance, subscriptionRent, systemAccountMinimum] = await Promise.all([
      connection.getBalance(subscriber),
      connection.getMinimumBalanceForRentExemption(SUBSCRIPTION_ACCOUNT_SPACE),
      connection.getMinimumBalanceForRentExemption(0),
    ]);
    const lamports = topUpLamports({ subscriberBalance, subscriptionRent, systemAccountMinimum });
    if (lamports > 0) instructions.push(createTopUpInstruction(sponsoringRelayer.publicKey, subscriber, lamports));
  }

  instructions.push(
    createAssociatedTokenAccountIdempotentInstruction(feePayer, subscriberAta, subscriber, tokenMint),
    createApproveInstruction(subscriberAta, programAuthority, subscriber, plan.amount * ALLOWANCE_CYCLES),
  );

  const { instruction: subscribeIx } = await client.buildSubscribeInstruction({
    subscriber,
    plan: planPubkey,
    tokenMint,
    subscriberTokenAccount: subscriberAta,
    merchantTokenAccount,
  });
  instructions.push(subscribeIx);

  const { blockhash } = await connection.getLatestBlockhash("confirmed");
  const message = new TransactionMessage({
    payerKey: feePayer,
    recentBlockhash: blockhash,
    instructions,
  }).compileToV0Message();

  const tx = new VersionedTransaction(message);
  if (sponsoringRelayer) sponsorTransaction(tx, sponsoringRelayer);

  return {
    transaction: Buffer.from(tx.serialize()).toString("base64"),
    sponsored: sponsoringRelayer !== null,
  };
}
