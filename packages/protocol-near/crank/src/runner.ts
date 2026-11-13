import type { MerchantPlan, SubscriptionRecord, TxOutcome } from "@tidepay/sdk-near";

export interface WatchedSubscription {
  planId: string;
  subscriberId: string;
}

/** The slice of TidePayNearClient the keeper needs. */
export interface CrankClient {
  keeperAccountId?: string;
  isSubscriptionDue(planId: string, subscriberId: string): Promise<boolean>;
  processEpoch(p: WatchedSubscription): Promise<TxOutcome>;
  getSubscription?(planId: string, subscriberId: string): Promise<SubscriptionRecord | null>;
  getPlan?(planId: string): Promise<MerchantPlan | null>;
  isStorageRegistered?(tokenId: string, accountId: string): Promise<boolean>;
  registerStorage?(tokenId: string, accountId: string): Promise<unknown>;
}

export interface StateQueryProvider {
  query(params: {
    request_type: "view_state";
    account_id: string;
    prefix_base64: string;
    finality: "optimistic";
  }): Promise<{ values: { key: string; value: string }[] }>;
}

const SUBSCRIPTIONS_PREFIX_BYTE = 0x73; // 's' from LookupMap::new(b"s") in contracts-near
const SUBSCRIPTIONS_PREFIX_B64 = Buffer.from("s").toString("base64");

/** Decodes a Borsh LookupMap<String, _> key under prefix `b"s"` into { planId, subscriberId }. */
export function decodeSubscriptionStorageKey(keyBase64: string): WatchedSubscription | null {
  const buf = Buffer.from(keyBase64, "base64");
  if (buf.length < 6 || buf[0] !== SUBSCRIPTIONS_PREFIX_BYTE) return null;
  const len = buf.readUInt32LE(1);
  if (buf.length !== 5 + len) return null;
  const raw = buf.subarray(5, 5 + len).toString("utf8");
  const sep = raw.indexOf(":");
  if (sep <= 0 || sep === raw.length - 1) return null;
  return { planId: raw.slice(0, sep), subscriberId: raw.slice(sep + 1) };
}

/** Discovers all subscriptions stored on the NEAR contract via view_state. */
export async function discoverSubscriptionsFromState(
  provider: StateQueryProvider,
  contractId: string,
): Promise<WatchedSubscription[]> {
  const res = await provider.query({
    request_type: "view_state",
    account_id: contractId,
    prefix_base64: SUBSCRIPTIONS_PREFIX_B64,
    finality: "optimistic",
  });
  return res.values
    .map((entry) => decodeSubscriptionStorageKey(entry.key))
    .filter((item): item is WatchedSubscription => item !== null);
}

export class NearCrankRunner {
  private running = false;
  private readonly registeredTokens = new Set<string>();

  constructor(
    private readonly client: CrankClient,
    private readonly watchSource: WatchedSubscription[] | (() => Promise<WatchedSubscription[]>),
    private readonly log: Pick<Console, "log" | "error"> = console,
  ) {}

  /** Settles every due subscription once. Skips if the previous tick is still running. */
  async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const watched = typeof this.watchSource === "function" ? await this.watchSource() : this.watchSource;
      const planCache = new Map<string, MerchantPlan | null>();

      for (const sub of watched) {
        const key = `${sub.planId}:${sub.subscriberId}`;
        try {
          if (this.client.getSubscription && this.client.getPlan) {
            const record = await this.client.getSubscription(sub.planId, sub.subscriberId);
            if (!record || !record.is_active) continue;

            let plan = planCache.get(sub.planId);
            if (plan === undefined) {
              plan = await this.client.getPlan(sub.planId);
              planCache.set(sub.planId, plan);
            }
            if (!plan || !plan.is_active) continue;
            if (BigInt(record.deposited_balance) < BigInt(plan.amount)) continue;

            if (
              BigInt(plan.crank_bounty) > 0n &&
              this.client.keeperAccountId &&
              this.client.isStorageRegistered &&
              this.client.registerStorage &&
              !this.registeredTokens.has(plan.token_id)
            ) {
              const registered = await this.client.isStorageRegistered(plan.token_id, this.client.keeperAccountId);
              if (!registered) {
                this.log.log(`[NEAR-CRANK] Registering keeper ${this.client.keeperAccountId} on ${plan.token_id}...`);
                await this.client.registerStorage(plan.token_id, this.client.keeperAccountId);
              }
              this.registeredTokens.add(plan.token_id);
            }
          }

          // Ask the contract, not the local clock: its block time is what process_epoch enforces.
          if (!(await this.client.isSubscriptionDue(sub.planId, sub.subscriberId))) continue;
          this.log.log(`[NEAR-CRANK] Settling ${key}...`);
          const outcome = await this.client.processEpoch(sub);
          const failed = typeof outcome.status === "object" && "Failure" in outcome.status;
          const hash = outcome.transaction_outcome?.id ?? outcome.transaction?.hash ?? "";
          this.log[failed ? "error" : "log"](`[NEAR-CRANK] ${failed ? "FAILED" : "Settled"} ${key} tx=${hash}`);
        } catch (err) {
          this.log.error(`[NEAR-CRANK] Error on ${key}:`, err instanceof Error ? err.message : err);
        }
      }
    } catch (err) {
      this.log.error("[NEAR-CRANK] Tick discovery error:", err instanceof Error ? err.message : err);
    } finally {
      this.running = false;
    }
  }
}

/** Parses "planId:subscriberId,planId:subscriberId" (subscriber ids contain no ':'). */
export function parseWatchList(raw: string): WatchedSubscription[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((entry) => {
      const i = entry.indexOf(":");
      if (i <= 0 || i === entry.length - 1) throw new Error(`Invalid watch entry "${entry}", expected planId:subscriberId`);
      return { planId: entry.slice(0, i), subscriberId: entry.slice(i + 1) };
    });
}
