"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey } from "@solana/web3.js";
import { createClient, fetchMerchantPlans, fetchSubscriptions } from "@/lib/chain/accounts";
import { USE_SAMPLE_DATA } from "@/lib/chain/config";
import { deriveMerchantData } from "@/lib/chain/derive";
import { getSampleMerchantData } from "@/lib/data";
import type { MerchantData } from "@/lib/types";

export type MerchantDataState =
  | { status: "disconnected" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: MerchantData; isSample: boolean };

interface MerchantDataContextValue {
  state: MerchantDataState;
  refresh: () => void;
}

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

  const merchant = publicKey?.toBase58() ?? null;
  const requestKey = merchant ? `${merchant}:${version}` : null;

  useEffect(() => {
    if (USE_SAMPLE_DATA || !merchant || !requestKey) return;
    let cancelled = false;
    loadMerchantData(connection, new PublicKey(merchant)).then(
      (data) => {
        if (!cancelled) setResult({ key: requestKey, data });
      },
      (error: unknown) => {
        console.error("[TidePay] Failed to load merchant data:", error);
        if (!cancelled) setResult({ key: requestKey, error: "Could not load data from Solana Devnet." });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [connection, merchant, requestKey]);

  const refresh = useCallback(() => setVersion((current) => current + 1), []);

  let state: MerchantDataState;
  if (USE_SAMPLE_DATA) state = { status: "ready", data: getSampleMerchantData(), isSample: true };
  else if (!requestKey) state = { status: "disconnected" };
  else if (result?.key !== requestKey) state = { status: "loading" };
  else if (result.error || !result.data) state = { status: "error", message: result.error ?? "Unknown error" };
  else state = { status: "ready", data: result.data, isSample: false };

  return <MerchantDataContext.Provider value={{ state, refresh }}>{children}</MerchantDataContext.Provider>;
}

export function useMerchantData() {
  const value = useContext(MerchantDataContext);
  if (!value) throw new Error("useMerchantData must be used inside MerchantDataProvider");
  return value;
}
