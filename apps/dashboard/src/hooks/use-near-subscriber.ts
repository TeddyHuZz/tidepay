"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { NearConnector } from "@hot-labs/near-connect";
import { NEAR_NETWORK_ID } from "@/lib/near/config";

export interface NearCallParams {
  contractId: string;
  methodName: string;
  args: Record<string, unknown>;
  deposit?: bigint;
  gas?: bigint;
}

const DEFAULT_GAS = BigInt(100) * BigInt(10) ** BigInt(12);

/** Connects a subscriber's own NEAR wallet through NEAR Connect and sends function calls from it. */
export function useNearSubscriber() {
  const connectorRef = useRef<NearConnector | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let detach = () => {};

    (async () => {
      // NEAR Connect touches window and IndexedDB, so it is loaded in the browser only.
      const { NearConnector } = await import("@hot-labs/near-connect");
      if (cancelled) return;
      const connector = new NearConnector({ network: NEAR_NETWORK_ID });
      connectorRef.current = connector;

      const onSignIn = ({ accounts }: { accounts: { accountId: string }[] }) => setAccountId(accounts[0]?.accountId ?? null);
      const onSignOut = () => setAccountId(null);
      connector.events.on("wallet:signIn", onSignIn);
      connector.events.on("wallet:signOut", onSignOut);
      detach = () => {
        connector.events.off("wallet:signIn", onSignIn);
        connector.events.off("wallet:signOut", onSignOut);
      };

      try {
        const { accounts } = await connector.getConnectedWallet(); // rejects when nobody is signed in
        if (!cancelled) setAccountId(accounts[0]?.accountId ?? null);
      } catch {
        /* no saved session */
      } finally {
        if (!cancelled) setRestoring(false);
      }
    })();

    return () => {
      cancelled = true;
      detach();
    };
  }, []);

  const connect = useCallback(async () => {
    const connector = connectorRef.current;
    if (!connector) return;
    setBusy(true);
    try {
      const wallet = await connector.connect();
      const accounts = await wallet.getAccounts();
      setAccountId(accounts[0]?.accountId ?? null);
    } finally {
      setBusy(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    await connectorRef.current?.disconnect();
    setAccountId(null);
  }, []);

  /** Sends one function call from the connected wallet and returns the transaction hash. */
  const callFunction = useCallback(async (call: NearCallParams): Promise<string> => {
    const connector = connectorRef.current;
    if (!connector) throw new Error("Wallet is not ready yet.");
    const wallet = await connector.wallet();
    const outcome = (await wallet.signAndSendTransaction({
      receiverId: call.contractId,
      actions: [
        {
          type: "FunctionCall",
          params: {
            methodName: call.methodName,
            args: call.args,
            gas: String(call.gas ?? DEFAULT_GAS),
            deposit: String(call.deposit ?? BigInt(0)),
          },
        },
      ],
    })) as { transaction_outcome?: { id?: string }; transaction?: { hash?: string } };
    return outcome.transaction_outcome?.id ?? outcome.transaction?.hash ?? "";
  }, []);

  return { accountId, connecting: restoring || busy, connect, disconnect, callFunction };
}
