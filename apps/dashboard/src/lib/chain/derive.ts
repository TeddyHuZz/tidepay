// Pure mapping from decoded on-chain accounts to dashboard view models.
// Kept free of RPC and React so it can be unit-tested.

import type {
  ActivityEvent,
  CrankStatusRow,
  MerchantData,
  Metric,
  PlanSummary,
  SubscriberRow,
  SubscriptionStatus,
} from "@/lib/types";
import { PAST_DUE_GRACE_SECONDS, USDC_DECIMALS } from "./config";

export interface PlanAccount {
  address: string;
  merchant: string;
  tokenMint: string;
  merchantTokenAccount: string;
  amount: bigint;
  intervalSeconds: bigint;
  planId: string;
  protocolFeeBps: number;
  crankBountyAmount: bigint;
  isActive: boolean;
}

export interface SubscriptionAccount {
  address: string;
  plan: string;
  subscriber: string;
  startTimestamp: bigint;
  lastEpochTimestamp: bigint;
  nextEpochTimestamp: bigint;
  cycleCount: bigint;
  isActive: boolean;
}

const THIRTY_DAYS = BigInt(2_592_000);

/** 29_000_000n -> "29.00"; keeps up to 6 decimals, at least 2. */
export function formatUsdc(amount: bigint, decimals = USDC_DECIMALS): string {
  const negative = amount < BigInt(0);
  const abs = negative ? -amount : amount;
  const base = BigInt(10) ** BigInt(decimals);
  const whole = abs / base;
  const fraction = (abs % base).toString().padStart(decimals, "0").replace(/0+$/, "").padEnd(2, "0");
  const wholeText = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${negative ? "-" : ""}${wholeText}.${fraction}`;
}

/** "29.5" -> 29_500_000n; null when not a positive amount with <= 6 decimals. */
export function parseUsdc(input: string, decimals = USDC_DECIMALS): bigint | null {
  const value = input.trim();
  const match = new RegExp(`^(\\d+)(?:\\.(\\d{1,${decimals}}))?$`).exec(value);
  if (!match) return null;
  const units = BigInt(match[1]) * BigInt(10) ** BigInt(decimals) + BigInt((match[2] ?? "").padEnd(decimals, "0") || "0");
  return units > BigInt(0) ? units : null;
}

function isoFromUnix(seconds: bigint) {
  return new Date(Number(seconds) * 1000).toISOString();
}

export function subscriptionStatus(sub: SubscriptionAccount, nowSeconds: number): SubscriptionStatus {
  if (!sub.isActive) return "Cancelled";
  return nowSeconds > Number(sub.nextEpochTimestamp) + PAST_DUE_GRACE_SECONDS ? "PastDue" : "Active";
}

function formatCountdown(seconds: number) {
  if (seconds <= 0) return "due now";
  const days = Math.floor(seconds / 86_400);
  if (days > 0) return `in ${days}d ${Math.floor((seconds % 86_400) / 3_600)}h`;
  const hours = Math.floor(seconds / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  const secs = seconds % 60;
  if (hours > 0) return `in ${hours}h ${minutes}m`;
  return `in ${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function deriveMerchantData(
  plans: PlanAccount[],
  subscriptions: SubscriptionAccount[],
  nowSeconds: number,
): MerchantData {
  const planByAddress = new Map(plans.map((plan) => [plan.address, plan]));
  const statusOf = new Map(subscriptions.map((sub) => [sub.address, subscriptionStatus(sub, nowSeconds)]));

  const planSummaries: PlanSummary[] = plans.map((plan) => ({
    id: plan.address,
    name: plan.planId,
    priceUsdc: formatUsdc(plan.amount),
    intervalSeconds: Number(plan.intervalSeconds),
    subscribers: subscriptions.filter((sub) => sub.plan === plan.address).length,
    active: plan.isActive,
  }));

  const subscriberRows: SubscriberRow[] = subscriptions
    .map((sub) => ({
      id: sub.address,
      wallet: sub.subscriber,
      plan: planByAddress.get(sub.plan)?.planId ?? sub.plan,
      lastBilledAt: isoFromUnix(sub.lastEpochTimestamp),
      nextDueAt: isoFromUnix(sub.nextEpochTimestamp),
      status: statusOf.get(sub.address) ?? "Active",
    }))
    .sort((a, b) => b.lastBilledAt.localeCompare(a.lastBilledAt));

  const active = subscriptions.filter((sub) => statusOf.get(sub.address) === "Active");
  const mrr = active.reduce((total, sub) => {
    const plan = planByAddress.get(sub.plan);
    if (!plan || plan.intervalSeconds <= BigInt(0)) return total;
    return total + (plan.amount * THIRTY_DAYS) / plan.intervalSeconds;
  }, BigInt(0));
  const pulls = subscriptions.reduce((total, sub) => total + sub.cycleCount, BigInt(0));

  const metrics: Metric[] = [
    { label: "Active MRR", value: `${formatUsdc(mrr)} USDC`, note: "Active subscriptions, normalised to 30 days" },
    { label: "Total subscribers", value: String(subscriptions.length), note: `${active.length} active` },
    { label: "Successful pulls", value: pulls.toString(), note: "Across current subscriptions" },
    { label: "Crank uptime", value: "—", note: "Not reported by the crank yet" },
  ];

  const activity: ActivityEvent[] = [];
  for (const sub of subscriptions) {
    const plan = planByAddress.get(sub.plan);
    const planName = plan?.planId ?? sub.plan;
    const amount = plan ? formatUsdc(plan.amount) : "—";
    activity.push({
      id: `${sub.address}:last`,
      at: isoFromUnix(sub.lastEpochTimestamp),
      kind: sub.cycleCount <= BigInt(1) ? "subscribed" : "settled",
      wallet: sub.subscriber,
      plan: planName,
      amountUsdc: `+${amount}`,
    });
    if (statusOf.get(sub.address) === "PastDue") {
      activity.push({
        id: `${sub.address}:due`,
        at: isoFromUnix(sub.nextEpochTimestamp),
        kind: "past_due",
        wallet: sub.subscriber,
        plan: planName,
        amountUsdc: amount,
      });
    }
  }
  activity.sort((a, b) => b.at.localeCompare(a.at));

  const crankPulls = subscriptions.filter((sub) => sub.cycleCount > BigInt(1));
  const lastPull = crankPulls.reduce<bigint | null>(
    (latest, sub) => (latest === null || sub.lastEpochTimestamp > latest ? sub.lastEpochTimestamp : latest),
    null,
  );
  const upcoming = subscriptions.filter((sub) => sub.isActive).map((sub) => Number(sub.nextEpochTimestamp));
  const nextDue = upcoming.length > 0 ? Math.min(...upcoming) : null;

  const crank: CrankStatusRow[] = [
    { label: "Last pull", value: lastPull === null ? "—" : `${isoFromUnix(lastPull).slice(11, 19)} UTC` },
    { label: "Next due", value: nextDue === null ? "—" : formatCountdown(nextDue - nowSeconds) },
    { label: "Pending epochs", value: String(upcoming.filter((due) => due <= nowSeconds).length) },
  ];

  return { plans: planSummaries, subscribers: subscriberRows, metrics, activity: activity.slice(0, 8), crank };
}
