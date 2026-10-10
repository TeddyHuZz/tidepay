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

/** All active subscriptions belonging to a subscriber wallet across any plan. */
export async function fetchSubscriberSubscriptions(
  client: TidePayClient,
  subscriber: PublicKey,
): Promise<SubscriptionAccount[]> {
  const coder = client.program.coder.accounts;
  // In SubscriptionRecord: discriminator is 8 bytes, plan is 32 bytes, subscriber starts at offset 40
  const SUBSCRIBER_FIELD_OFFSET = 40;
  try {
    const results = await client.connection.getProgramAccounts(client.programId, {
      filters: [
        { memcmp: coder.memcmp("subscriptionRecord") },
        { memcmp: { offset: SUBSCRIBER_FIELD_OFFSET, bytes: subscriber.toBase58() } },
      ],
    });
    return results.map(({ pubkey, account: info }) =>
      toSubscription(pubkey, coder.decode<RawSubscription>("subscriptionRecord", info.data)),
    );
  } catch (err) {
    console.error("[TidePay] fetchSubscriberSubscriptions error:", err);
    return [];
  }
}

export function parseAddress(value: string): PublicKey | null {
  try {
    return new PublicKey(value);
  } catch {
    return null;
  }
}

export interface PlanOnChainEvent {
  signature: string;
  kind: "settled" | "subscribed" | "cancelled" | "created" | "transaction";
  label: string;
  timestamp: number;
  timeFormatted: string;
  err: boolean;
  amountUsdc?: string;
  amountGrossUsdc?: string;
  amountNetUsdc?: string;
  keeperFeeUsdc?: string;
  subscriber?: string;
  planName?: string;
  planAddress?: string;
}

const parsedTxCache = new Map<string, { kind: PlanOnChainEvent["kind"]; label: string; subscriber?: string }>();

export async function fetchPlanActivity(
  connection: Connection,
  planPubkey: PublicKey,
  priceUsdc: string,
  keeperFeeUsdc = "0.05",
  limit = 20,
  planName?: string,
): Promise<PlanOnChainEvent[]> {
  try {
    const sigs = await connection.getSignaturesForAddress(planPubkey, { limit });
    if (sigs.length === 0) return [];

    const priceNum = parseFloat(priceUsdc) || 0;
    const feeNum = parseFloat(keeperFeeUsdc) || 0;
    const netNum = Math.max(0, priceNum - feeNum).toFixed(2);

    // Inspect uncached signatures in a single batch request (up to 20 signatures per batch)
    const uncached = sigs.filter((s) => !parsedTxCache.has(s.signature)).slice(0, 20);
    if (uncached.length > 0) {
      try {
        const txs = await connection.getParsedTransactions(
          uncached.map((s) => s.signature),
          { maxSupportedTransactionVersion: 0 },
        );
        for (let i = 0; i < uncached.length; i++) {
          const sig = uncached[i];
          const tx = txs[i];
          if (!tx) continue;

          const logs = tx.meta?.logMessages ?? [];
          const accountKeys = tx.transaction.message.accountKeys ?? [];
          const signerKey = accountKeys.find((k: any) => k.signer)?.pubkey.toBase58();

          if (logs.some((l) => l.includes("Instruction: CancelSubscription"))) {
            parsedTxCache.set(sig.signature, { kind: "cancelled", label: "Subscription Cancelled", subscriber: signerKey });
          } else if (logs.some((l) => l.includes("Instruction: Subscribe"))) {
            parsedTxCache.set(sig.signature, { kind: "subscribed", label: "New Subscription", subscriber: signerKey });
          } else if (logs.some((l) => l.includes("Instruction: ProcessEpoch"))) {
            parsedTxCache.set(sig.signature, { kind: "settled", label: "On-chain Settlement" });
          } else if (logs.some((l) => l.includes("Instruction: InitializePlan"))) {
            parsedTxCache.set(sig.signature, { kind: "created", label: "Plan Initialized" });
          }
        }
      } catch {
        // Silently skip if RPC rate limits or delays; heuristic fallback applies cleanly
      }
    }

    return sigs.map((sig, idx) => {
      const isInitial = idx === sigs.length - 1;
      const blockTime = sig.blockTime ? sig.blockTime * 1000 : Date.now();
      const isFailed = Boolean(sig.err);

      const cached = parsedTxCache.get(sig.signature);
      const kind: PlanOnChainEvent["kind"] = cached?.kind ?? (isInitial ? "created" : "settled");
      const label = cached?.label ?? (isInitial ? "Plan Initialized" : "On-chain Settlement");

      const isTransfer = kind === "settled" || kind === "subscribed";

      return {
        signature: sig.signature,
        kind,
        label,
        timestamp: blockTime,
        timeFormatted: new Date(blockTime).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
        amountUsdc: isTransfer ? `+${netNum}` : undefined,
        amountNetUsdc: isTransfer ? `+${netNum}` : undefined,
        amountGrossUsdc: isTransfer ? priceUsdc : undefined,
        keeperFeeUsdc: isTransfer ? keeperFeeUsdc : undefined,
        subscriber: cached?.subscriber,
        planName,
        planAddress: planPubkey.toBase58(),
        err: isFailed,
      };
    });
  } catch (error) {
    console.warn("[TidePay] RPC fetchPlanActivity notice:", error);
    return [];
  }
}

export async function fetchAllMerchantPlansActivity(
  connection: Connection,
  plans: { id: string; name: string; priceUsdc: string }[],
  keeperFeeUsdc = "0.05",
  limitPerPlan = 20,
): Promise<PlanOnChainEvent[]> {
  try {
    const eventsPerPlan = await Promise.all(
      plans.map(async (plan) => {
        const pubkey = parseAddress(plan.id);
        if (!pubkey) return [];
        return fetchPlanActivity(connection, pubkey, plan.priceUsdc, keeperFeeUsdc, limitPerPlan, plan.name);
      }),
    );
    return eventsPerPlan.flat().sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.warn("[TidePay] RPC fetchAllMerchantPlansActivity notice:", error);
    return [];
  }
}
