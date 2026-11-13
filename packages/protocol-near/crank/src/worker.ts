import { Account, JsonRpcProvider, KeyPairSigner, type KeyPairString } from "near-api-js";
import { TidePayNearClient } from "@tidepay/sdk-near";
import {
  NearCrankRunner,
  discoverSubscriptionsFromState,
  parseWatchList,
  type StateQueryProvider,
  type WatchedSubscription,
} from "./runner.js";

const DEFAULT_POLL_INTERVAL_MS = 10_000;

export interface NearCrankHandle {
  runner: NearCrankRunner;
  stop: () => void;
}

export function startNearCrankFromEnv(log: Pick<Console, "log" | "error"> = console): NearCrankHandle | null {
  const accountId = process.env.NEAR_CRANK_ACCOUNT_ID?.trim();
  const privateKey = process.env.NEAR_CRANK_PRIVATE_KEY?.trim();
  const contractId = (process.env.TIDEPAY_NEAR_CONTRACT_ID || process.env.NEXT_PUBLIC_TIDEPAY_NEAR_CONTRACT)?.trim();

  if (!accountId || !privateKey || !contractId) {
    return null;
  }

  const networkId = process.env.NEAR_NETWORK_ID?.trim() || "testnet";
  const rpcUrl =
    process.env.NEAR_RPC_URL?.trim() ||
    (networkId === "mainnet" ? "https://free.rpc.fastnear.com" : "https://rpc.testnet.near.org");
  const pollMs = parseInt(process.env.NEAR_CRANK_POLL_MS || String(DEFAULT_POLL_INTERVAL_MS), 10);
  const staticWatched = process.env.NEAR_CRANK_WATCH?.trim() ? parseWatchList(process.env.NEAR_CRANK_WATCH) : [];

  const provider = new JsonRpcProvider({ url: rpcUrl });
  const signer = KeyPairSigner.fromSecretKey(privateKey as KeyPairString);
  const sdkClient = new TidePayNearClient(new Account(accountId, provider, signer), contractId);

  const client = {
    keeperAccountId: accountId,
    isSubscriptionDue: (planId: string, subscriberId: string) => sdkClient.isSubscriptionDue(planId, subscriberId),
    processEpoch: (p: WatchedSubscription) => sdkClient.processEpoch(p),
    getSubscription: (planId: string, subscriberId: string) => sdkClient.getSubscription(planId, subscriberId),
    getPlan: (planId: string) => sdkClient.getPlan(planId),
    isStorageRegistered: (tokenId: string, acct: string) => sdkClient.isStorageRegistered(tokenId, acct),
    registerStorage: (tokenId: string, acct: string) => sdkClient.registerStorage(tokenId, acct),
  };

  const discover = async (): Promise<WatchedSubscription[]> => {
    const onChain = await discoverSubscriptionsFromState(provider as unknown as StateQueryProvider, contractId);
    if (staticWatched.length === 0) return onChain;
    const seen = new Set(onChain.map((s) => `${s.planId}:${s.subscriberId}`));
    const merged = [...onChain];
    for (const item of staticWatched) {
      const k = `${item.planId}:${item.subscriberId}`;
      if (!seen.has(k)) {
        seen.add(k);
        merged.push(item);
      }
    }
    return merged;
  };

  const runner = new NearCrankRunner(client, discover, log);
  log.log(`[NEAR-CRANK] Keeper ${accountId} auto-discovering subscriptions on ${contractId} (${networkId}) via ${rpcUrl}`);

  void runner.tick();
  const timer = setInterval(() => void runner.tick(), pollMs);

  return {
    runner,
    stop: () => clearInterval(timer),
  };
}
