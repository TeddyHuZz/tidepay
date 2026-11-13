// Maps NEAR contract records into the dashboard's MerchantData view model and merges them with the Solana data.
import type { MerchantPlan, SubscriptionRecord } from "@tidepay/sdk-near";
import { PAST_DUE_GRACE_SECONDS } from "@/lib/chain/config";
import { formatUsdc, parseUsdc } from "@/lib/chain/derive";
import type { ActivityEvent, MerchantData, Metric, PlanSummary, SubscriberRow, SubscriptionStatus } from "@/lib/types";
import { toNearPlanId } from "./ids";

const THIRTY_DAYS = BigInt(2_592_000);
const NANOS_PER_SECOND = BigInt(1_000_000_000);
const RECENT_ACTIVITY_LIMIT = 8;

const secondsOf = (ns: string) => Number(BigInt(ns) / NANOS_PER_SECOND);
const isoOf = (ns: string) => new Date(secondsOf(ns) * 1000).toISOString();

function statusOf(sub: SubscriptionRecord, nowSeconds: number): SubscriptionStatus {
  if (!sub.is_active) return "Cancelled";
  return nowSeconds > secondsOf(sub.next_epoch_timestamp_ns) + PAST_DUE_GRACE_SECONDS ? "PastDue" : "Active";
}

export function deriveNearMerchantData(
  plans: MerchantPlan[],
  subscriptionsByPlan: Record<string, SubscriptionRecord[]>,
  nowSeconds: number,
): MerchantData {
  const planSummaries: PlanSummary[] = plans.map((plan) => ({
    id: toNearPlanId(plan.plan_id),
    name: plan.plan_id,
    priceUsdc: formatUsdc(BigInt(plan.amount)),
    intervalSeconds: plan.interval_seconds,
    subscribers: (subscriptionsByPlan[plan.plan_id] ?? []).length,
    active: plan.is_active,
    network: "near",
  }));

  const rows: { sub: SubscriptionRecord; plan: MerchantPlan; status: SubscriptionStatus }[] = [];
  for (const plan of plans) {
    for (const sub of subscriptionsByPlan[plan.plan_id] ?? []) rows.push({ sub, plan, status: statusOf(sub, nowSeconds) });
  }

  const subscribers: SubscriberRow[] = rows
    .map(({ sub, plan, status }) => {
      const planAmount = BigInt(plan.amount);
      const depositedBalance = BigInt(sub.deposited_balance || "0");
      return {
        id: `${sub.plan_id}:${sub.subscriber_id}`,
        wallet: sub.subscriber_id,
        plan: sub.plan_id,
        startedAt: isoOf(sub.start_timestamp_ns),
        lastBilledAt: isoOf(sub.last_epoch_timestamp_ns),
        nextDueAt: isoOf(sub.next_epoch_timestamp_ns),
        status,
        network: "near" as const,
        cycleCount: sub.cycle_count,
        prepaidLeftUsdc: formatUsdc(depositedBalance),
        prepaidCyclesLeft: planAmount > BigInt(0) ? Number(depositedBalance / planAmount) : 0,
        totalPaidUsdc: formatUsdc(BigInt(sub.cycle_count) * planAmount),
      };
    })
    .sort((a, b) => b.lastBilledAt.localeCompare(a.lastBilledAt));

  const active = rows.filter((r) => r.status === "Active");
  const mrr = active.reduce((total, { plan }) => {
    const interval = BigInt(plan.interval_seconds);
    return interval > BigInt(0) ? total + (BigInt(plan.amount) * THIRTY_DAYS) / interval : total;
  }, BigInt(0));
  const pulls = rows.reduce((total, { sub }) => total + sub.cycle_count, 0);

  const metrics: Metric[] = [
    { label: "Active MRR", value: `${formatUsdc(mrr)} USDC`, note: "Active subscriptions, normalised to 30 days" },
    { label: "Total subscribers", value: String(rows.length), note: `${active.length} active` },
    { label: "Successful pulls", value: String(pulls), note: "Across current subscriptions" },
  ];

  const activity: ActivityEvent[] = [];
  for (const { sub, plan, status } of rows) {
    const amount = formatUsdc(BigInt(plan.amount));
    activity.push({
      id: `${sub.plan_id}:${sub.subscriber_id}:last`,
      at: isoOf(sub.last_epoch_timestamp_ns),
      kind: sub.cycle_count <= 1 ? "subscribed" : "settled",
      wallet: sub.subscriber_id,
      plan: sub.plan_id,
      amountUsdc: `+${amount}`,
    });
    if (status === "PastDue") {
      activity.push({ id: `${sub.plan_id}:${sub.subscriber_id}:due`, at: isoOf(sub.next_epoch_timestamp_ns), kind: "past_due", wallet: sub.subscriber_id, plan: sub.plan_id, amountUsdc: amount });
    }
  }
  activity.sort((a, b) => b.at.localeCompare(a.at));

  return { plans: planSummaries, subscribers, metrics, activity: activity.slice(0, RECENT_ACTIVITY_LIMIT), crank: [] };
}

const toUnits = (text: string) => parseUsdc(text.replace(/[^0-9.]/g, "")) ?? BigInt(0);
const toCount = (text: string) => Number(text.replace(/[^0-9]/g, "")) || 0;

/** Combines Solana and NEAR data. A missing NEAR side (not set up or RPC down) leaves Solana untouched. */
export function mergeMerchantData(solana: MerchantData, near: MerchantData | null): MerchantData {
  if (!near) return solana;

  const plans = [...solana.plans, ...near.plans];
  const subscribers = [...solana.subscribers, ...near.subscribers].sort((a, b) => b.lastBilledAt.localeCompare(a.lastBilledAt));
  const activity = [...solana.activity, ...near.activity].sort((a, b) => b.at.localeCompare(a.at)).slice(0, RECENT_ACTIVITY_LIMIT);

  // An empty Solana workspace shows a different set of tiles; use NEAR's rather than splicing mismatched ones.
  if (solana.plans.length === 0) return { plans, subscribers, activity, metrics: near.metrics, crank: solana.crank };

  const nearByLabel = new Map(near.metrics.map((m) => [m.label, m]));
  const activeCount = subscribers.filter((s) => s.status === "Active").length;
  const metrics = solana.metrics.map((m): Metric => {
    const other = nearByLabel.get(m.label);
    if (!other) return m;
    if (m.label === "Active MRR") return { ...m, value: `${formatUsdc(toUnits(m.value) + toUnits(other.value))} USDC` };
    if (m.label === "Total subscribers") return { ...m, value: String(toCount(m.value) + toCount(other.value)), note: `${activeCount} active` };
    if (m.label === "Successful pulls") return { ...m, value: String(toCount(m.value) + toCount(other.value)) };
    return m;
  });

  return { plans, subscribers, activity, metrics, crank: solana.crank };
}
