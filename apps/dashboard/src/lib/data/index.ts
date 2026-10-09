// Single data-access seam for the dashboard.
//
// Every function is async and returns UI view models from src/lib/types.
// They currently serve sample data. To integrate on-chain data, replace each
// body with @tidepay/sdk calls (getPlan, listSubscribers, ...) mapped into
// these shapes. Pages, components and the Blink route need no changes.
//
// Once these hit the network, wrap the callers in <Suspense> or cache the
// result with `use cache`: the app runs with cacheComponents enabled.
import type {
  ActivityEvent,
  CrankStatusRow,
  Metric,
  PlanSummary,
  SubscriberRow,
} from "@/lib/types";
import { ACTIVITY, CRANK_STATUS, METRICS, PLANS, SUBSCRIBERS } from "./mock";

export async function getOverviewMetrics(): Promise<Metric[]> {
  return METRICS;
}

export async function getRecentActivity(): Promise<ActivityEvent[]> {
  return ACTIVITY;
}

export async function getCrankStatus(): Promise<CrankStatusRow[]> {
  return CRANK_STATUS;
}

export async function listPlans(): Promise<PlanSummary[]> {
  return PLANS;
}

export async function getPlan(planId: string): Promise<PlanSummary | undefined> {
  return PLANS.find((plan) => plan.id === planId);
}

export async function listSubscribers(): Promise<SubscriberRow[]> {
  return SUBSCRIBERS;
}
