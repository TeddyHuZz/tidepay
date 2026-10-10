// Data entry points that run outside the merchant's wallet context.
// Merchant-scoped data (plans, subscribers, metrics) is loaded in the browser
// by components/merchant-data-provider.tsx, because it depends on the
// connected wallet.
import { Connection } from "@solana/web3.js";
import { createClient, fetchPlan, parseAddress } from "@/lib/chain/accounts";
import { RPC_URL, USE_SAMPLE_DATA } from "@/lib/chain/config";
import { formatUsdc } from "@/lib/chain/derive";
import type { MerchantData } from "@/lib/types";
import { SAMPLE_DATA } from "./mock";

export function getSampleMerchantData(): MerchantData {
  return SAMPLE_DATA;
}

export interface CheckoutPlan {
  /** Plan address (sample data: slug). */
  id: string;
  name: string;
  priceUsdc: string;
  intervalSeconds: number;
  active: boolean;
  isSample: boolean;
  merchant?: string;
}

/** Plan shown on /checkout/[planId]; planId is the on-chain plan address. */
export async function getCheckoutPlan(planId: string): Promise<CheckoutPlan | null> {
  if (USE_SAMPLE_DATA) {
    const plan = SAMPLE_DATA.plans.find((candidate) => candidate.id === planId);
    return plan ? { ...plan, isSample: true } : null;
  }

  const address = parseAddress(planId);
  if (!address) return null;

  const plan = await fetchPlan(createClient(new Connection(RPC_URL, "confirmed")), address);
  if (!plan) return null;

  return {
    id: plan.address,
    merchant: plan.merchant,
    name: plan.planId,
    priceUsdc: formatUsdc(plan.amount),
    intervalSeconds: Number(plan.intervalSeconds),
    active: plan.isActive,
    isSample: false,
  };
}
