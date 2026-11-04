import type { Account, SerializedReturnValue } from "near-api-js";

export type TxOutcome = Awaited<ReturnType<Account["callFunctionRaw"]>>;

export const DEFAULT_CRANK_BOUNTY = 50_000n;
export const DEFAULT_PROTOCOL_FEE_BPS = 50;
/** Covers a NEP-141 storage registration (0.02 NEAR; the token refunds any excess). */
export const TOKEN_STORAGE_DEPOSIT_YOCTO = 20_000_000_000_000_000_000_000n;
const ONE_YOCTO = 1n; // NEP-141 ft_transfer_call requires exactly 1 yoctoNEAR
const TGAS = 1_000_000_000_000n;

export interface MerchantPlan {
  plan_id: string;
  merchant_id: string;
  token_id: string;
  amount: string;
  interval_seconds: number;
  protocol_fee_bps: number;
  crank_bounty: string;
  is_active: boolean;
  created_at_ns: string;
}

export interface SubscriptionRecord {
  plan_id: string;
  subscriber_id: string;
  start_timestamp_ns: string;
  last_epoch_timestamp_ns: string;
  next_epoch_timestamp_ns: string;
  cycle_count: number;
  is_active: boolean;
  deposited_balance: string;
}

export class TidePayNearClient {
  constructor(
    public readonly account: Account,
    public readonly contractId: string,
  ) {}

  createPlan(p: {
    planId: string;
    tokenId: string;
    amount: bigint;
    intervalSeconds: number;
    crankBounty?: bigint;
    protocolFeeBps?: number;
  }) {
    return this.account.callFunction({
      contractId: this.contractId,
      methodName: "create_plan",
      args: {
        plan_id: p.planId,
        token_id: p.tokenId,
        amount: p.amount.toString(),
        interval_seconds: p.intervalSeconds,
        crank_bounty: (p.crankBounty ?? DEFAULT_CRANK_BOUNTY).toString(),
        protocol_fee_bps: p.protocolFeeBps ?? DEFAULT_PROTOCOL_FEE_BPS,
      },
      gas: 30n * TGAS,
    });
  }

  /** Sends tokens to the contract via ft_transfer_call. `depositAmount` covers epoch 0 plus prepaid cycles. */
  subscribe(p: { planId: string; tokenId: string; depositAmount: bigint }) {
    return this.ftTransferCall(p.tokenId, p.depositAmount, { action: "subscribe", plan_id: p.planId });
  }

  /** Tops up the prepaid balance of an existing active subscription. */
  deposit(p: { planId: string; tokenId: string; amount: bigint }) {
    return this.ftTransferCall(p.tokenId, p.amount, { action: "deposit", plan_id: p.planId });
  }

  /** Returns the raw outcome so callers can read `transaction.hash` and check `status`. */
  processEpoch(p: { planId: string; subscriberId: string }): Promise<TxOutcome> {
    return this.account.callFunctionRaw({
      contractId: this.contractId,
      methodName: "process_epoch",
      args: { plan_id: p.planId, subscriber_id: p.subscriberId },
      gas: 100n * TGAS,
    });
  }

  cancelSubscription(planId: string) {
    return this.account.callFunction({
      contractId: this.contractId,
      methodName: "cancel_subscription",
      args: { plan_id: planId },
      deposit: 0n,
      gas: 60n * TGAS,
    });
  }

  togglePlanStatus(planId: string, isActive: boolean) {
    return this.account.callFunction({
      contractId: this.contractId,
      methodName: "toggle_plan_status",
      args: { plan_id: planId, is_active: isActive },
      gas: 30n * TGAS,
    });
  }

  /** Registers `accountId` on a NEP-141 token so it can receive transfers; paid by this client's account. */
  registerStorage(tokenId: string, accountId: string) {
    return this.account.callFunction({
      contractId: tokenId,
      methodName: "storage_deposit",
      args: { account_id: accountId, registration_only: true },
      deposit: TOKEN_STORAGE_DEPOSIT_YOCTO,
      gas: 30n * TGAS,
    });
  }

  async isStorageRegistered(tokenId: string, accountId: string): Promise<boolean> {
    return (await this.view("storage_balance_of", { account_id: accountId }, tokenId)) != null;
  }

  async getFtBalance(tokenId: string, accountId: string): Promise<bigint> {
    return BigInt((await this.view<string>("ft_balance_of", { account_id: accountId }, tokenId)) ?? "0");
  }

  async getMerchantPlans(merchantId: string, fromIndex = 0, limit = 100): Promise<MerchantPlan[]> {
    return (await this.view<MerchantPlan[]>("get_merchant_plans", { merchant_id: merchantId, from_index: fromIndex, limit })) ?? [];
  }

  async getPlanSubscribers(planId: string, fromIndex = 0, limit = 100): Promise<SubscriptionRecord[]> {
    return (await this.view<SubscriptionRecord[]>("get_plan_subscribers", { plan_id: planId, from_index: fromIndex, limit })) ?? [];
  }

  async getPlan(planId: string): Promise<MerchantPlan | null> {
    return (await this.view<MerchantPlan>("get_plan", { plan_id: planId })) ?? null;
  }

  async getSubscription(planId: string, subscriberId: string): Promise<SubscriptionRecord | null> {
    return (await this.view<SubscriptionRecord>("get_subscription", { plan_id: planId, subscriber_id: subscriberId })) ?? null;
  }

  async isSubscriptionDue(planId: string, subscriberId: string): Promise<boolean> {
    return (await this.view<boolean>("is_subscription_due", { plan_id: planId, subscriber_id: subscriberId })) ?? false;
  }

  private ftTransferCall(tokenId: string, amount: bigint, msg: { action: string; plan_id: string }) {
    return this.account.callFunction({
      contractId: tokenId,
      methodName: "ft_transfer_call",
      args: { receiver_id: this.contractId, amount: amount.toString(), msg: JSON.stringify(msg) },
      deposit: ONE_YOCTO,
      gas: 100n * TGAS,
    });
  }

  private view<T extends SerializedReturnValue>(method: string, args: Record<string, unknown>, contractId = this.contractId) {
    return this.account.provider.callFunction<T>({ contractId, method, args });
  }
}
