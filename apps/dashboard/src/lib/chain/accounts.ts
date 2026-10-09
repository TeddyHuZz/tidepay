// Reads TidePay accounts through @tidepay/sdk. The SDK has no list queries
// yet, so plans and subscriptions are found with getProgramAccounts filters
// and decoded with the SDK program's coder.

import { Connection, PublicKey } from "@solana/web3.js";
import { TidePayClient } from "@tidepay/sdk";
import type { PlanAccount, SubscriptionAccount } from "./derive";

/** Byte offset of the first field after the 8-byte Anchor discriminator. */
const FIRST_FIELD_OFFSET = 8;

interface Numeric {
  toString(): string;
}

interface RawPlan {
  merchant: PublicKey;
  tokenMint: PublicKey;
  merchantTokenAccount: PublicKey;
  amount: Numeric;
  intervalSeconds: Numeric;
  planId: string;
  protocolFeeBps: number;
  crankBountyAmount: Numeric;
  isActive: boolean;
}

interface RawSubscription {
  plan: PublicKey;
  subscriber: PublicKey;
  startTimestamp: Numeric;
  lastEpochTimestamp: Numeric;
  nextEpochTimestamp: Numeric;
  cycleCount: Numeric;
  isActive: boolean;
}

export function createClient(connection: Connection) {
  return new TidePayClient(connection);
}

function toPlan(address: PublicKey, raw: RawPlan): PlanAccount {
  return {
    address: address.toBase58(),
    merchant: raw.merchant.toBase58(),
    tokenMint: raw.tokenMint.toBase58(),
    merchantTokenAccount: raw.merchantTokenAccount.toBase58(),
    amount: BigInt(raw.amount.toString()),
    intervalSeconds: BigInt(raw.intervalSeconds.toString()),
    planId: raw.planId,
    protocolFeeBps: raw.protocolFeeBps,
    crankBountyAmount: BigInt(raw.crankBountyAmount.toString()),
    isActive: raw.isActive,
  };
}

function toSubscription(address: PublicKey, raw: RawSubscription): SubscriptionAccount {
  return {
    address: address.toBase58(),
    plan: raw.plan.toBase58(),
    subscriber: raw.subscriber.toBase58(),
    startTimestamp: BigInt(raw.startTimestamp.toString()),
    lastEpochTimestamp: BigInt(raw.lastEpochTimestamp.toString()),
    nextEpochTimestamp: BigInt(raw.nextEpochTimestamp.toString()),
    cycleCount: BigInt(raw.cycleCount.toString()),
    isActive: raw.isActive,
  };
}

async function findAccounts<T>(client: TidePayClient, account: "merchantPlan" | "subscriptionRecord", firstField: PublicKey) {
  const coder = client.program.coder.accounts;
  const results = await client.connection.getProgramAccounts(client.programId, {
    filters: [{ memcmp: coder.memcmp(account) }, { memcmp: { offset: FIRST_FIELD_OFFSET, bytes: firstField.toBase58() } }],
  });
  return results.map(({ pubkey, account: info }) => ({ pubkey, raw: coder.decode<T>(account, info.data) }));
}

/** All plans created by a merchant wallet. */
export async function fetchMerchantPlans(client: TidePayClient, merchant: PublicKey): Promise<PlanAccount[]> {
  const accounts = await findAccounts<RawPlan>(client, "merchantPlan", merchant);
  return accounts.map(({ pubkey, raw }) => toPlan(pubkey, raw));
}

/** All live subscriptions to the given plans (cancelled ones are closed on-chain). */
export async function fetchSubscriptions(client: TidePayClient, plans: PublicKey[]): Promise<SubscriptionAccount[]> {
  const perPlan = await Promise.all(
    plans.map((plan) => findAccounts<RawSubscription>(client, "subscriptionRecord", plan)),
  );
  return perPlan.flat().map(({ pubkey, raw }) => toSubscription(pubkey, raw));
}

export async function fetchPlan(client: TidePayClient, address: PublicKey): Promise<PlanAccount | null> {
  const plan = await client.getMerchantPlan(address);
  if (!plan) return null;
  return {
    address: address.toBase58(),
    merchant: plan.merchant,
    tokenMint: plan.tokenMint,
    merchantTokenAccount: plan.merchantTokenAccount,
    amount: plan.amount,
    intervalSeconds: plan.intervalSeconds,
    planId: plan.planId,
    protocolFeeBps: plan.protocolFeeBps,
    crankBountyAmount: plan.crankBountyAmount,
    isActive: plan.isActive,
  };
}

export async function fetchSubscription(
  client: TidePayClient,
  plan: PublicKey,
  subscriber: PublicKey,
): Promise<SubscriptionAccount | null> {
  const [address] = client.findSubscriptionRecordPda(plan, subscriber);
  const record = await client.getSubscriptionRecord(address);
  if (!record) return null;
  return {
    address: address.toBase58(),
    plan: record.plan,
    subscriber: record.subscriber,
    startTimestamp: record.startTimestamp,
    lastEpochTimestamp: record.lastEpochTimestamp,
    nextEpochTimestamp: record.nextEpochTimestamp,
    cycleCount: record.cycleCount,
    isActive: record.isActive,
  };
}

export function parseAddress(value: string): PublicKey | null {
  try {
    return new PublicKey(value);
  } catch {
    return null;
  }
}
