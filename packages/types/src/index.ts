// Export Anchor types & IDL placeholders
export interface MerchantPlan {
  merchant: string;
  planId: string;
  amount: bigint;
  intervalSeconds: bigint;
  mint: string;
}

export interface SubscriptionRecord {
  subscriber: string;
  plan: string;
  lastEpochTimestamp: bigint;
  isActive: boolean;
}