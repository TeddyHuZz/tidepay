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

export interface MerchantDataErrorInfo {
  title: string;
  message: string;
  rpcEndpoint: string;
  cluster: "Solana Devnet" | "Solana Mainnet";
  status?: number;
  isAuthError: boolean;
  isRateLimit: boolean;
  isCorsOrNetwork: boolean;
  hint: string;
}

export type MerchantDataState =
  | { status: "disconnected" }
  | { status: "loading" }
  | { status: "error"; message: string; errorInfo?: MerchantDataErrorInfo }
  | { status: "ready"; data: MerchantData; isSample: boolean };

export interface MerchantDataContextValue {
  state: MerchantDataState;
  refresh: () => void;
  isRefreshing: boolean;
  lastRefreshedAt: number | null;
}

const AUTO_POLL_INTERVAL_MS = 45_000;

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
  errorInfo?: MerchantDataErrorInfo;
}

export function MerchantDataProvider({ children }: { children: ReactNode }) {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const { activeProject } = useProject();
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
          if (!cancelled) {
            const rawMsg = error instanceof Error ? error.message : String(error);
            const cluster = activeProject.environment === "live" ? "Solana Mainnet" : "Solana Devnet";
            const rpcEndpoint = connection.rpcEndpoint;

            const isAuthError =
              rawMsg.includes("401") ||
              rawMsg.toLowerCase().includes("unauthorized") ||
              rawMsg.includes("403") ||
              rawMsg.toLowerCase().includes("forbidden");

            const isRateLimit =
              rawMsg.includes("429") ||
              rawMsg.toLowerCase().includes("too many requests") ||
              rawMsg.toLowerCase().includes("rate limit");

            const isCorsOrNetwork =
              rawMsg.toLowerCase().includes("failed to fetch") ||
              rawMsg.toLowerCase().includes("networkerror") ||
              rawMsg.toLowerCase().includes("load failed");

            let title = `Failed to connect to ${cluster}`;
            let hint = "Unable to read on-chain accounts. Check your RPC node connection.";
            let status: number | undefined;

            if (isAuthError) {
              title = "RPC Authentication Failed (401 Unauthorized)";
              status = 401;
              hint =
                "The RPC endpoint rejected the request because it requires an API key. For providers like Helius, QuickNode, or Triton, ensure your URL includes ?api-key=..., or leave the custom RPC blank in Project Settings to use TidePay's default cluster connection.";
            } else if (isRateLimit) {
              title = "RPC Rate Limit Exceeded (429)";
              status = 429;
              hint =
                "The RPC node has rate-limited requests from this client. Open Project Settings to connect a dedicated paid RPC endpoint.";
            } else if (isCorsOrNetwork) {
              title = "RPC Connection Failed (Network/CORS)";
              hint =
                "The browser could not reach the RPC endpoint. Verify that the URL is online and supports browser CORS requests.";
            }

            setResult({
              key: requestKey,
              error: rawMsg,
              errorInfo: {
                title,
                message: rawMsg,
                rpcEndpoint,
                cluster,
                status,
                isAuthError,
                isRateLimit,
                isCorsOrNetwork,
                hint,
              },
            });
          }
        },
      )
      .finally(() => {
        if (!cancelled) setIsRefreshing(false);
      });
    return () => {
      cancelled = true;
    };
  }, [connection, merchant, requestKey, activeProject.environment]);

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

  const refresh = useCallback(() => setVersion((current) => current + 1), []);

  let state: MerchantDataState;
  if (USE_SAMPLE_DATA) {
    state = { status: "ready", data: getSampleMerchantData(), isSample: true };
  } else if (!requestKey) {
    state = { status: "disconnected" };
  } else if (result?.data) {
    // Scope data by active project
    const rawData = result.data;
    const allowed = activeProject.planIds || [];

    // If active project has specific planIds assigned, show only those plans.
    // If it's a fresh workspace and user creates plans, all newly created plans bind to it.
    const filteredPlans = allowed.length > 0
      ? rawData.plans.filter((p) => allowed.includes(p.id) || allowed.includes(p.name))
      : rawData.plans;

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
    state = { status: "error", message: result.error, errorInfo: result.errorInfo };
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
