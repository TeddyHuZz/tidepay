// View models used by the dashboard UI. They are deliberately independent of
// the on-chain account types; src/lib/chain/derive.ts maps accounts into them.

export type IntervalId = "daily" | "weekly" | "monthly" | "annual" | "custom";

export interface BillingInterval {
  id: string;
  label: string;
  /** Phrase used in "every ..." copy. */
  unit: string;
  seconds: number;
}

export const INTERVALS: readonly BillingInterval[] = [
  { id: "daily", label: "Daily", unit: "day", seconds: 86_400 },
  { id: "weekly", label: "7-Day", unit: "7 days", seconds: 604_800 },
  { id: "monthly", label: "30-Day", unit: "30 days", seconds: 2_592_000 },
  { id: "annual", label: "1-Year", unit: "year", seconds: 31_536_000 },
];

export function getInterval(id: string): BillingInterval {
  return INTERVALS.find((interval) => interval.id === id) ?? INTERVALS[2];
}

function plural(count: number, unit: string) {
  return `${count} ${unit}${count === 1 ? "" : "s"}`;
}

/** "every ..." phrase for any interval, matching the presets where possible. */
export function intervalUnit(seconds: number): string {
  const preset = INTERVALS.find((interval) => interval.seconds === seconds);
  if (preset) return preset.unit;
  if (seconds % 31_536_000 === 0) return plural(seconds / 31_536_000, "year");
  if (seconds % 2_592_000 === 0) return plural(seconds / 2_592_000, "month");
  if (seconds % 604_800 === 0) return plural(seconds / 604_800, "week");
  if (seconds % 86_400 === 0) return plural(seconds / 86_400, "day");
  if (seconds % 3_600 === 0) return plural(seconds / 3_600, "hour");
  if (seconds % 60 === 0) return plural(seconds / 60, "minute");
  return plural(seconds, "second");
}

/** Short label for tables. */
export function intervalLabel(seconds: number): string {
  return INTERVALS.find((interval) => interval.seconds === seconds)?.label ?? `Every ${intervalUnit(seconds)}`;
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
  /** On-chain plan address (sample data uses a slug). */
  id: string;
  /** The on-chain plan ID; plans have no separate display name. */
  name: string;
  priceUsdc: string;
  intervalSeconds: number;
  subscribers: number;
  active: boolean;
}

export interface SubscriberRow {
  /** Subscription record address (sample data uses a placeholder). */
  id: string;
  wallet: string;
  plan: string;
  lastBilledAt: string;
  nextDueAt: string;
  status: SubscriptionStatus;
}

export interface MerchantData {
  plans: PlanSummary[];
  subscribers: SubscriberRow[];
  metrics: Metric[];
  activity: ActivityEvent[];
  crank: CrankStatusRow[];
}
