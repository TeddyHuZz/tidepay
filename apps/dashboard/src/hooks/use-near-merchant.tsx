"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
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

interface Session {
  /** Solana wallet this session belongs to; a different wallet is a different NEAR account. */
  owner: string | null;
  status: NearMerchantStatus;
  accountId: string | null;
  client: TidePayNearClient | null;
  error: string | null;
}

const IDLE: Omit<Session, "owner"> = { status: "idle", accountId: null, client: null, error: null };

const NearMerchantContext = createContext<NearMerchantState | null>(null);

const noSubscribe = () => () => {};

/**
 * Holds the merchant's embedded NEAR account for the whole app, so it is derived once per page load and only
 * when something asks for it (never at login). The derived secret key lives in memory only.
 */
export function NearMerchantProvider({ children }: { children: ReactNode }) {
  const { wallets } = useWallets();
  const { signMessage } = useSignMessage();
  const wallet = wallets[0] ?? null;
  const walletAddress = wallet?.address ?? null;

  const [stored, setStored] = useState<Session>({ owner: null, ...IDLE });
  const inFlight = useRef<{ owner: string; promise: Promise<TidePayNearClient | null> } | null>(null);

  // Ignore a session that belongs to a previously connected wallet.
  const session: Session = stored.owner === walletAddress ? stored : { owner: walletAddress, ...IDLE };

  // The public key remembered from an earlier setup gives the account id, so the console can read it without a signature.
  const rememberedKey = useSyncExternalStore(
    noSubscribe,
    () => (walletAddress ? window.localStorage.getItem(`tidepay:near:pk:${walletAddress}`) : null),
    () => null,
  );
  const rememberedAccountId = useMemo(() => (rememberedKey ? implicitAccountIdFromPublicKey(rememberedKey) : null), [rememberedKey]);

  const prepare = useCallback(async () => {
    if (session.client) return session.client;
    if (!wallet) {
      setStored({ owner: null, ...IDLE, status: "error", error: "Sign in to use NEAR plans." });
      return null;
    }
    const owner = wallet.address;
    if (inFlight.current?.owner === owner) return inFlight.current.promise;

    const patch = (next: Partial<Omit<Session, "owner">>) =>
      setStored((prev) => ({ ...(prev.owner === owner ? prev : { owner, ...IDLE }), ...next, owner }));

    const promise = (async () => {
      patch({ error: null });
      try {
        const result = await prepareNearAccount({
          solanaAddress: owner,
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
          onStatus: (status) => patch({ status }),
        });
        const ready = createNearChainOps(result.keyPair, result.accountId).client;
        patch({ status: "ready", accountId: result.accountId, client: ready, error: null });
        return ready;
      } catch (e) {
        console.error("[TidePay] NEAR account setup failed:", e);
        patch({ status: "error", error: describeNearError(e) });
        return null;
      } finally {
        inFlight.current = null;
      }
    })();
    inFlight.current = { owner, promise };
    return promise;
  }, [session.client, signMessage, wallet]);

  const accountId = session.accountId ?? rememberedAccountId;
  const value = useMemo(
    () => ({ status: session.status, accountId, client: session.client, error: session.error, prepare }),
    [session.status, accountId, session.client, session.error, prepare],
  );
  return <NearMerchantContext.Provider value={value}>{children}</NearMerchantContext.Provider>;
}

export function useNearMerchant(): NearMerchantState {
  const value = useContext(NearMerchantContext);
  if (!value) throw new Error("useNearMerchant must be used inside NearMerchantProvider");
  return value;
}
