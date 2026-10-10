"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey } from "@solana/web3.js";
import { createClient, fetchMerchantPlans, fetchSubscriptions } from "@/lib/chain/accounts";
import { USE_SAMPLE_DATA } from "@/lib/chain/config";
import { deriveMerchantData } from "@/lib/chain/derive";
import { getSampleMerchantData } from "@/lib/data";
import type { MerchantData } from "@/lib/types";
import { useProject } from "@/components/project-context";

export type MerchantDataState =
  | { status: "disconnected" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: MerchantData; isSample: boolean };

export interface MerchantDataContextValue {
  state: MerchantDataState;
  refresh: () => void;
  isRefreshing: boolean;
  lastRefreshedAt: number | null;
}

const AUTO_POLL_INTERVAL_MS = 20_000;

const MerchantDataContext = createContext<MerchantDataContextValue | null>(null);

async function loadMerchantData(connection: Connection, merchant: PublicKey): Promise<MerchantData> {
  const client = createClient(connection);
  const plans = await fetchMerchantPlans(client, merchant);
  const subscriptions = await fetchSubscriptions(
    client,
    plans.map((plan) => new PublicKey(plan.address)),
  );
  return deriveMerchantData(plans, subscriptions, Math.floor(Date.now() / 1000));
}

interface LoadResult {
  key: string;
  data?: MerchantData;
  error?: string;
}

export function MerchantDataProvider({ children }: { children: ReactNode }) {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState<LoadResult | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<number | null>(null);

  const merchant = publicKey?.toBase58() ?? null;
  const requestKey = merchant ? `${merchant}:${version}` : null;

  useEffect(() => {
    if (USE_SAMPLE_DATA || !merchant || !requestKey) return;
    let cancelled = false;
    setIsRefreshing(true);
    loadMerchantData(connection, new PublicKey(merchant))
      .then(
        (data) => {
          if (!cancelled) {
            setResult({ key: requestKey, data });
            setLastRefreshedAt(Date.now());
          }
        },
        (error: unknown) => {
          console.error("[TidePay] Failed to load merchant data:", error);
          if (!cancelled) setResult({ key: requestKey, error: "Could not load data from Solana Devnet." });
        },
      )
      .finally(() => {
        if (!cancelled) setIsRefreshing(false);
      });
    return () => {
      cancelled = true;
    };
  }, [connection, merchant, requestKey]);

  // Visibility-aware auto-polling: polls every 20s while active; pauses when tab is hidden
  useEffect(() => {
    if (USE_SAMPLE_DATA || !merchant) return;

    let lastTick = Date.now();
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        setVersion((v) => v + 1);
        lastTick = Date.now();
      }
    }, AUTO_POLL_INTERVAL_MS);

    const onVisibilityChange = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible" && Date.now() - lastTick >= 10_000) {
        setVersion((v) => v + 1);
        lastTick = Date.now();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [merchant]);

  const { activeProject } = useProject();
  const refresh = useCallback(() => setVersion((current) => current + 1), []);

  let state: MerchantDataState;
  if (USE_SAMPLE_DATA) {
    state = { status: "ready", data: getSampleMerchantData(), isSample: true };
  } else if (!requestKey) {
    state = { status: "disconnected" };
  } else if (result?.data) {
    // Scope data by active project
    const rawData = result.data;
    const isAxiom = activeProject.id === "proj_axiom";
    const allowed = activeProject.planIds || [];

    const filteredPlans = isAxiom
      ? rawData.plans.filter(
          (p) => allowed.includes(p.id) || allowed.includes(p.name) || p.name === "google-pro" || allowed.length === 0
        )
      : rawData.plans.filter((p) => allowed.includes(p.id) || allowed.includes(p.name));

    const planNames = new Set(filteredPlans.map((p) => p.name));
    const planIds = new Set(filteredPlans.map((p) => p.id));
    const filteredSubs = rawData.subscribers.filter((s) => planNames.has(s.plan) || planIds.has(s.plan));
    const filteredActivity = rawData.activity.filter((a) => !a.plan || planNames.has(a.plan) || planIds.has(a.plan));

    const scopedData: MerchantData =
      filteredPlans.length === 0
        ? {
            plans: [],
            subscribers: [],
            metrics: [
              { label: "Total Earned (Net)", value: "0.00 USDC", note: "Across 0 settlements" },
              { label: "Monthly Revenue (MRR)", value: "0.00 USDC", note: "Active subscriptions, normalised to 30 days" },
              { label: "Active Subscribers", value: "0", note: "0 total all-time" },
              { label: "Renewal Success Rate", value: "100%", note: "100% on-chain settlements" },
            ],
            activity: [],
            crank: rawData.crank,
          }
        : {
            plans: filteredPlans,
            subscribers: filteredSubs,
            metrics: rawData.metrics,
            activity: filteredActivity,
            crank: rawData.crank,
          };

    // Keep existing data visible smoothly during background refetches
    state = { status: "ready", data: scopedData, isSample: false };
  } else if (result?.error) {
    state = { status: "error", message: result.error };
  } else {
    // Initial first-time load only
    state = { status: "loading" };
  }

  return (
    <MerchantDataContext.Provider value={{ state, refresh, isRefreshing, lastRefreshedAt }}>
      {children}
    </MerchantDataContext.Provider>
  );
}

export function useMerchantData() {
  const value = useContext(MerchantDataContext);
  if (!value) throw new Error("useMerchantData must be used inside MerchantDataProvider");
  return value;
}
