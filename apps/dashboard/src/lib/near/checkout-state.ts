import { PAST_DUE_GRACE_SECONDS } from "@/lib/chain/config";
import { parseUsdc } from "@/lib/chain/derive";

export type NearCheckoutState = "no-plan" | "paused" | "needs-funds" | "ready" | "subscribed" | "past-due";

export const MIN_PREPAID_CYCLES = 1;
export const MAX_PREPAID_CYCLES = 12;
export const DEFAULT_PREPAID_CYCLES = 3;

const NANOS_PER_SECOND = BigInt(1_000_000_000);

/** What the NEAR checkout card should offer, given what the chain says. */
export function nearCheckoutState(input: {
  plan: { active: boolean } | null;
  subscription: { is_active: boolean; next_epoch_timestamp_ns: string } | null;
  balance: bigint;
  required: bigint;
  nowNs: bigint;
}): NearCheckoutState {
  if (!input.plan) return "no-plan";

  // An existing subscriber can always see and cancel, even if the plan is paused or their wallet is empty.
  if (input.subscription?.is_active) {
    const lateNs = input.nowNs - BigInt(input.subscription.next_epoch_timestamp_ns);
    return lateNs > BigInt(PAST_DUE_GRACE_SECONDS) * NANOS_PER_SECOND ? "past-due" : "subscribed";
  }

  if (!input.plan.active) return "paused";
  return input.balance < input.required ? "needs-funds" : "ready";
}

/** Token units to send for `cycles` renewals; zero when the price or cycle count is invalid. */
export function prepaidAmount(priceUsdc: string, cycles: number): bigint {
  if (!Number.isInteger(cycles) || cycles < MIN_PREPAID_CYCLES || cycles > MAX_PREPAID_CYCLES) return BigInt(0);
  const price = parseUsdc(priceUsdc.replace(/,/g, ""));
  return price === null ? BigInt(0) : price * BigInt(cycles);
}
