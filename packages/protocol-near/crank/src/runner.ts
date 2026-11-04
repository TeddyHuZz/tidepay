import type { TxOutcome } from "@tidepay/sdk-near";

export interface WatchedSubscription {
  planId: string;
  subscriberId: string;
}

/** The slice of TidePayNearClient the keeper needs. */
export interface CrankClient {
  isSubscriptionDue(planId: string, subscriberId: string): Promise<boolean>;
  processEpoch(p: WatchedSubscription): Promise<TxOutcome>;
}

export class NearCrankRunner {
  private running = false;

  constructor(
    private readonly client: CrankClient,
    private readonly watched: WatchedSubscription[],
    private readonly log: Pick<Console, "log" | "error"> = console,
  ) {}

  /** Settles every due subscription once. Skips if the previous tick is still running. */
  async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      for (const sub of this.watched) {
        const key = `${sub.planId}:${sub.subscriberId}`;
        try {
          // Ask the contract, not the local clock: its block time is what process_epoch enforces.
          if (!(await this.client.isSubscriptionDue(sub.planId, sub.subscriberId))) continue;
          this.log.log(`[NEAR-CRANK] Settling ${key}...`);
          const outcome = await this.client.processEpoch(sub);
          const failed = typeof outcome.status === "object" && "Failure" in outcome.status;
          const hash = outcome.transaction_outcome.id;
          this.log[failed ? "error" : "log"](`[NEAR-CRANK] ${failed ? "FAILED" : "Settled"} ${key} tx=${hash}`);
        } catch (err) {
          this.log.error(`[NEAR-CRANK] Error on ${key}:`, err instanceof Error ? err.message : err);
        }
      }
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
