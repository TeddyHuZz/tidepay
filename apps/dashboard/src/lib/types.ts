// View models used by the dashboard UI. These are deliberately independent of
// the on-chain account types; src/lib/data maps SDK results into them.

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

export function getInterval(id: IntervalId): BillingInterval {
  return INTERVALS.find((interval) => interval.id === id) ?? INTERVALS[1];
}

export type SubscriptionStatus = "Active" | "PastDue" | "Cancelled";

export type ActivityKind = "settled" | "subscribed" | "past_due" | "cancelled";

export interface Metric {
  label: string;
  value: string;
  note: string;
}

export interface CrankStatusRow {
  label: string;
  value: string;
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
