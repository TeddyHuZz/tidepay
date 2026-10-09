// Sample data for building the UI before @tidepay/sdk is ready.
// Replace each export with an SDK-backed loader; component props stay the same.

export type IntervalId = "daily" | "monthly" | "demo";

export interface BillingInterval {
  id: IntervalId;
  label: string;
  /** Phrase used in "every ..." copy. */
  unit: string;
  seconds: number;
}

export const INTERVALS: readonly BillingInterval[] = [
  { id: "daily", label: "Daily", unit: "day", seconds: 86_400 },
  { id: "monthly", label: "30-Day", unit: "30 days", seconds: 2_592_000 },
  { id: "demo", label: "60s Demo Mode", unit: "60 seconds", seconds: 60 },
];

export type SubscriptionStatus = "Active" | "PastDue" | "Cancelled";

export type ActivityKind = "settled" | "subscribed" | "past_due" | "cancelled";

export interface Metric {
  label: string;
  value: string;
  note: string;
}

export interface ActivityEvent {
  id: string;
  at: string;
  kind: ActivityKind;
  wallet: string;
  plan: string;
  amountUsdc: string;
}

export interface PlanSummary {
  id: string;
  name: string;
  priceUsdc: string;
  interval: IntervalId;
  subscribers: number;
  active: boolean;
}

export interface SubscriberRow {
  wallet: string;
  plan: string;
  lastBilledAt: string;
  nextDueAt: string;
  status: SubscriptionStatus;
}

export const METRICS: Metric[] = [
  { label: "Active MRR", value: "1,248.00 USDC", note: "Normalised to 30 days" },
  { label: "Total subscribers", value: "312", note: "296 active" },
  { label: "Successful pulls", value: "4,806", note: "Last 30 days" },
  { label: "Crank uptime", value: "99.94%", note: "Last 30 days" },
];

export const ACTIVITY: ActivityEvent[] = [
  { id: "a1", at: "2026-10-09T12:41:08Z", kind: "settled", wallet: "8fVqKd3nKd", plan: "PromptPilot Pro", amountUsdc: "+29.00" },
  { id: "a2", at: "2026-10-09T12:40:52Z", kind: "subscribed", wallet: "3tRwxq7Lm", plan: "PromptPilot Pro", amountUsdc: "+29.00" },
  { id: "a3", at: "2026-10-09T12:40:08Z", kind: "settled", wallet: "Bk2ZxxP9e", plan: "Demo 60s", amountUsdc: "+1.00" },
  { id: "a4", at: "2026-10-09T12:39:41Z", kind: "past_due", wallet: "Hd6Cv1Ya", plan: "PromptPilot Team", amountUsdc: "99.00" },
  { id: "a5", at: "2026-10-09T12:38:08Z", kind: "settled", wallet: "9mJs4aTf", plan: "Demo 60s", amountUsdc: "+1.00" },
  { id: "a6", at: "2026-10-09T12:36:17Z", kind: "cancelled", wallet: "Ww5Ne8Rc", plan: "PromptPilot Pro", amountUsdc: "0.00" },
];

export const CRANK_STATUS = [
  { label: "Last pull", value: "12:41:08" },
  { label: "Next due", value: "in 00:42" },
  { label: "Pending epochs", value: "3" },
];

export const PLANS: PlanSummary[] = [
  { id: "promptpilot-pro", name: "PromptPilot Pro", priceUsdc: "29.00", interval: "monthly", subscribers: 212, active: true },
  { id: "promptpilot-team", name: "PromptPilot Team", priceUsdc: "99.00", interval: "monthly", subscribers: 64, active: true },
  { id: "demo-60s", name: "Demo 60s", priceUsdc: "1.00", interval: "demo", subscribers: 36, active: true },
];

export const SUBSCRIBERS: SubscriberRow[] = [
  { wallet: "8fVqKd3nKd", plan: "PromptPilot Pro", lastBilledAt: "2026-10-09T12:41:08Z", nextDueAt: "2026-11-08T12:41:08Z", status: "Active" },
  { wallet: "3tRwxq7Lm", plan: "PromptPilot Pro", lastBilledAt: "2026-10-09T12:40:52Z", nextDueAt: "2026-11-08T12:40:52Z", status: "Active" },
  { wallet: "Bk2ZxxP9e", plan: "Demo 60s", lastBilledAt: "2026-10-09T12:40:08Z", nextDueAt: "2026-10-09T12:41:08Z", status: "Active" },
  { wallet: "Hd6Cv1Ya", plan: "PromptPilot Team", lastBilledAt: "2026-09-09T12:39:41Z", nextDueAt: "2026-10-09T12:39:41Z", status: "PastDue" },
  { wallet: "Ww5Ne8Rc", plan: "PromptPilot Pro", lastBilledAt: "2026-09-12T08:02:11Z", nextDueAt: "2026-10-12T08:02:11Z", status: "Cancelled" },
];

export function getPlan(planId: string): PlanSummary | undefined {
  return PLANS.find((plan) => plan.id === planId);
}

export function getInterval(id: IntervalId): BillingInterval {
  return INTERVALS.find((interval) => interval.id === id) ?? INTERVALS[1];
}
