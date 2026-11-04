"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useWallets, useSignMessage } from "@privy-io/react-auth/solana";
import type { TidePayNearClient } from "@tidepay/sdk-near";
import { API_URL } from "@/lib/chain/config";
import { createNearChainOps } from "@/lib/near/chain-ops";
import { implicitAccountIdFromPublicKey } from "@/lib/near/derive-key";
import { describeNearError } from "@/lib/near/errors";
import { prepareNearAccount, type PrepareStatus } from "@/lib/near/prepare";

export type NearMerchantStatus = "idle" | PrepareStatus | "ready" | "error";

export interface NearMerchantState {
  status: NearMerchantStatus;
  /** Known from this session or an earlier setup on this browser; null until the merchant first sets up NEAR. */
  accountId: string | null;
  /** Signs with the derived key; only set once `status === "ready"`. */
  client: TidePayNearClient | null;
  error: string | null;
  /** Derives, funds and registers the account. Safe to call repeatedly; resolves with the ready client. */
  prepare: () => Promise<TidePayNearClient | null>;
}

const NearMerchantContext = createContext<NearMerchantState | null>(null);

/**
 * Holds the merchant's embedded NEAR account for the whole app, so it is derived once per page load and only
 * when something asks for it (never at login). The derived secret key lives in memory only.
 */
export function NearMerchantProvider({ children }: { children: ReactNode }) {
  const { wallets } = useWallets();
  const { signMessage } = useSignMessage();
  const wallet = wallets[0] ?? null;

  const [status, setStatus] = useState<NearMerchantStatus>("idle");
  const [derivedAccountId, setDerivedAccountId] = useState<string | null>(null);
  const [rememberedAccountId, setRememberedAccountId] = useState<string | null>(null);
  const [client, setClient] = useState<TidePayNearClient | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef<Promise<TidePayNearClient | null> | null>(null);
  const walletAddress = wallet?.address ?? null;

  // A different Solana wallet is a different NEAR account.
  useEffect(() => {
    setStatus("idle");
    setDerivedAccountId(null);
    setClient(null);
    setError(null);
    inFlight.current = null;
    // The public key from an earlier setup tells us the account id, so the console can read it without a signature.
    const remembered = walletAddress ? window.localStorage.getItem(`tidepay:near:pk:${walletAddress}`) : null;
    setRememberedAccountId(remembered ? implicitAccountIdFromPublicKey(remembered) : null);
  }, [walletAddress]);

  const prepare = useCallback(async () => {
    if (client) return client;
    if (inFlight.current) return inFlight.current;
    if (!wallet) {
      setError("Sign in to use NEAR plans.");
      setStatus("error");
      return null;
    }

    const run = (async () => {
      setError(null);
      try {
        const result = await prepareNearAccount({
          solanaAddress: wallet.address,
          signDerivationMessage: async (message) => {
            const { signature } = await signMessage({ message, wallet, options: { uiOptions: { showWalletUIs: false } } });
            return signature;
          },
          storage: { get: (k) => window.localStorage.getItem(k), set: (k, v) => window.localStorage.setItem(k, v) },
          sponsor: async (id) => {
            const response = await fetch(`${API_URL}/api/near/sponsor`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ accountId: id }),
            });
            if (!response.ok) {
              const body = (await response.json().catch(() => ({}))) as { error?: string };
              throw new Error(body.error ?? "Could not fund your NEAR account.");
            }
          },
          connect: (keyPair, id) => createNearChainOps(keyPair, id).ops,
          onStatus: setStatus,
        });
        const ready = createNearChainOps(result.keyPair, result.accountId).client;
        setDerivedAccountId(result.accountId);
        setClient(ready);
        setStatus("ready");
        return ready;
      } catch (e) {
        console.error("[TidePay] NEAR account setup failed:", e);
        setError(describeNearError(e));
        setStatus("error");
        return null;
      } finally {
        inFlight.current = null;
      }
    })();
    inFlight.current = run;
    return run;
  }, [client, signMessage, wallet]);

  const accountId = derivedAccountId ?? rememberedAccountId;
  const value = useMemo(() => ({ status, accountId, client, error, prepare }), [status, accountId, client, error, prepare]);
  return <NearMerchantContext.Provider value={value}>{children}</NearMerchantContext.Provider>;
}

export function useNearMerchant(): NearMerchantState {
  const value = useContext(NearMerchantContext);
  if (!value) throw new Error("useNearMerchant must be used inside NearMerchantProvider");
  return value;
}
