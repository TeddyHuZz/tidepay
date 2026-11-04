import type { MerchantPlan, SubscriptionRecord } from "@tidepay/sdk-near";
import type { MerchantData } from "@/lib/types";
import { deriveNearMerchantData } from "./merchant-data";

/** The read methods of TidePayNearClient the console needs. */
export interface NearReader {
  getMerchantPlans(merchantId: string): Promise<MerchantPlan[]>;
  getPlanSubscribers(planId: string): Promise<SubscriptionRecord[]>;
}

// shortcut: reads the first page (100) of plans and of each plan's subscribers; add paging if a merchant outgrows that.
export async function fetchNearMerchantData(reader: NearReader, merchantId: string, nowSeconds: number): Promise<MerchantData> {
  const plans = await reader.getMerchantPlans(merchantId);
  const subscriptionsByPlan: Record<string, SubscriptionRecord[]> = {};
  await Promise.all(plans.map(async (p) => void (subscriptionsByPlan[p.plan_id] = await reader.getPlanSubscribers(p.plan_id))));
  return deriveNearMerchantData(plans, subscriptionsByPlan, nowSeconds);
}
