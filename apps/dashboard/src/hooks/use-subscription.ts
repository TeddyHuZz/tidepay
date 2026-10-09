"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, VersionedTransaction } from "@solana/web3.js";
import { useSendTransaction } from "@/hooks/use-send-transaction";
import { createClient, fetchSubscription, parseAddress } from "@/lib/chain/accounts";
import { API_URL } from "@/lib/chain/config";
import { subscriptionStatus, type SubscriptionAccount } from "@/lib/chain/derive";
import { describeTransactionError } from "@/lib/chain/errors";

export type SubscriptionLookup =
  | { status: "disconnected" }
  | { status: "loading" }
  | { status: "error" }
  | { status: "none" }
  | { status: "active" | "past_due"; record: SubscriptionAccount };

export type SubscriptionAction =
  | { status: "idle" }
  | { status: "pending"; kind: "subscribe" | "cancel" }
  | { status: "done"; kind: "subscribe" | "cancel"; signature: string }
  | { status: "error"; message: string };

interface LookupResult {
  key: string;
  record?: SubscriptionAccount | null;
  pastDue?: boolean;
  failed?: boolean;
}

/** Reads and changes the connected wallet's subscription to one plan. */
export function useSubscription(planAddress: string | null) {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const { buildTransaction, send } = useSendTransaction();
  const client = useMemo(() => createClient(connection), [connection]);

  const [version, setVersion] = useState(0);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [action, setAction] = useState<SubscriptionAction>({ status: "idle" });

  const plan = useMemo(() => (planAddress ? parseAddress(planAddress) : null), [planAddress]);
  const wallet = publicKey?.toBase58() ?? null;
  const requestKey = plan && wallet ? `${plan.toBase58()}:${wallet}:${version}` : null;

  useEffect(() => {
    if (!plan || !wallet || !requestKey) return;
    let cancelled = false;
    fetchSubscription(client, plan, new PublicKey(wallet)).then(
      (record) => {
        if (cancelled) return;
        const pastDue = record ? subscriptionStatus(record, Math.floor(Date.now() / 1000)) === "PastDue" : false;
        setResult({ key: requestKey, record, pastDue });
      },
      (error: unknown) => {
        console.error("[TidePay] Failed to load subscription:", error);
        if (!cancelled) setResult({ key: requestKey, failed: true });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [client, plan, wallet, requestKey]);

  let lookup: SubscriptionLookup;
  if (!requestKey) lookup = { status: "disconnected" };
  else if (result?.key !== requestKey) lookup = { status: "loading" };
  else if (result.failed) lookup = { status: "error" };
  else if (!result.record) lookup = { status: "none" };
  else lookup = { status: result.pastDue ? "past_due" : "active", record: result.record };

  const reload = useCallback(() => setVersion((current) => current + 1), []);

  const subscribe = useCallback(async () => {
    if (!publicKey || !plan) return;
    setAction({ status: "pending", kind: "subscribe" });
    try {
      // Same transaction the Blink returns, so both paths share one builder
      // (including relayer sponsorship).
      const response = await fetch(`${API_URL}/api/actions/subscribe/${plan.toBase58()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account: publicKey.toBase58() }),
      });
      const body = (await response.json()) as { transaction?: string; message?: string };
      if (!response.ok || !body.transaction) {
        setAction({ status: "error", message: body.message ?? "Could not prepare the subscription." });
        return;
      }
      const tx = VersionedTransaction.deserialize(Buffer.from(body.transaction, "base64"));
      const signature = await send(tx);
      setAction({ status: "done", kind: "subscribe", signature });
      reload();
    } catch (error) {
      console.error("[TidePay] subscribe failed:", error);
      setAction({ status: "error", message: describeTransactionError(error) });
    }
  }, [plan, publicKey, reload, send]);

  const cancel = useCallback(async () => {
    if (!publicKey || !plan) return;
    setAction({ status: "pending", kind: "cancel" });
    try {
      const { instruction } = await client.buildCancelSubscriptionInstruction({ subscriber: publicKey, plan });
      const signature = await send(await buildTransaction(publicKey, [instruction]));
      setAction({ status: "done", kind: "cancel", signature });
      reload();
    } catch (error) {
      console.error("[TidePay] cancel failed:", error);
      setAction({ status: "error", message: describeTransactionError(error) });
    }
  }, [buildTransaction, client, plan, publicKey, reload, send]);

  return { lookup, action, subscribe, cancel, reload };
}
