"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";
import type { SubscriptionRecord } from "@tidepay/sdk-near";
import { CheckoutShell } from "@/components/checkout/checkout-shell";
import { Button } from "@/components/ui/button";
import { useNearSubscriber } from "@/hooks/use-near-subscriber";
import { formatUsdc } from "@/lib/chain/derive";
import { formatDateTimeUtc, shortAddress } from "@/lib/format";
import { tryCreateNearReader } from "@/lib/near/chain-ops";
import {
  DEFAULT_PREPAID_CYCLES,
  MAX_PREPAID_CYCLES,
  MIN_PREPAID_CYCLES,
  nearCheckoutState,
  prepaidAmount,
} from "@/lib/near/checkout-state";
import { NEAR_CONTRACT_ID, NEAR_USDC_TOKEN_ID, nearExplorerUrl } from "@/lib/near/config";
import { describeNearError } from "@/lib/near/errors";

interface NearCheckoutCardProps {
  planId: string;
  merchant: string;
  name: string;
  priceUsdc: string;
  intervalSeconds: number;
  active: boolean;
}

type Action =
  | { status: "idle" }
  | { status: "pending"; kind: "subscribe" | "cancel" | "deposit" }
  | { status: "done"; kind: "subscribe" | "cancel" | "deposit"; hash: string }
  | { status: "error"; message: string };

interface ChainView {
  subscription: SubscriptionRecord | null;
  balance: bigint;
  /** When this was read; renewal lateness is judged against it. */
  readAtMs: number;
}

const ONE_YOCTO = BigInt(1);
const REREAD_DELAY_MS = 2_000;
const CANCEL_GAS = BigInt(60) * BigInt(10) ** BigInt(12);

export function NearCheckoutCard({ planId, merchant, name, priceUsdc, intervalSeconds, active }: NearCheckoutCardProps) {
  const wallet = useNearSubscriber();
  const [cycles, setCycles] = useState(DEFAULT_PREPAID_CYCLES);
  const [action, setAction] = useState<Action>({ status: "idle" });
  const [view, setView] = useState<{ owner: string; version: number; data: ChainView } | null>(null);
  const [version, setVersion] = useState(0);

  const accountId = wallet.accountId;
  const required = prepaidAmount(priceUsdc, cycles);
  const reader = useMemo(() => tryCreateNearReader(), []);

  // Reads what this wallet has on chain. A result for another account or an older refresh is ignored.
  useEffect(() => {
    if (!accountId || !reader) return;
    let cancelled = false;
    Promise.all([reader.getSubscription(planId, accountId), reader.getFtBalance(NEAR_USDC_TOKEN_ID, accountId)]).then(
      ([subscription, balance]) => !cancelled && setView({ owner: accountId, version, data: { subscription, balance, readAtMs: Date.now() } }),
      (error: unknown) => {
        console.error("[TidePay] Failed to read NEAR checkout state:", error);
        if (!cancelled) setAction({ status: "error", message: describeNearError(error) });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [accountId, planId, reader, version]);

  const loaded = accountId !== null && view?.owner === accountId && view.version === version;
  const data = loaded ? view.data : null;
  const subscription = data?.subscription ?? null;
  const isOwner = Boolean(accountId && accountId === merchant);

  const state = nearCheckoutState({
    plan: { active },
    subscription,
    balance: data?.balance ?? BigInt(0),
    required,
    nowNs: BigInt(data?.readAtMs ?? 0) * BigInt(1_000_000),
  });
  const pending = action.status === "pending";

  const run = useCallback(
    async (kind: "subscribe" | "cancel" | "deposit", send: () => Promise<string>) => {
      setAction({ status: "pending", kind });
      try {
        const hash = await send();
        setAction({ status: "done", kind, hash });
        setVersion((v) => v + 1);
        // Reads can lag the write by a moment; read again shortly so the card settles on the new state.
        setTimeout(() => setVersion((v) => v + 1), REREAD_DELAY_MS);
      } catch (error) {
        console.error(`[TidePay] NEAR ${kind} failed:`, error);
        setAction({ status: "error", message: describeNearError(error) });
      }
    },
    [],
  );

  const subscribe = () =>
    run("subscribe", () =>
      wallet.callFunction({
        contractId: NEAR_USDC_TOKEN_ID,
        methodName: "ft_transfer_call",
        args: { receiver_id: NEAR_CONTRACT_ID, amount: required.toString(), msg: JSON.stringify({ action: "subscribe", plan_id: planId }) },
        deposit: ONE_YOCTO,
      }),
    );

  const deposit = () =>
    run("deposit", () =>
      wallet.callFunction({
        contractId: NEAR_USDC_TOKEN_ID,
        methodName: "ft_transfer_call",
        args: { receiver_id: NEAR_CONTRACT_ID, amount: required.toString(), msg: JSON.stringify({ action: "deposit", plan_id: planId }) },
        deposit: ONE_YOCTO,
      }),
    );

  const cancel = () =>
    run("cancel", () =>
      wallet.callFunction({ contractId: NEAR_CONTRACT_ID, methodName: "cancel_subscription", args: { plan_id: planId }, gas: CANCEL_GAS }),
    );

  const ownerNotice = isOwner ? (
    <p className="rounded-md border border-warning/40 bg-warning-soft px-3 py-2 text-[13px] text-warning">
      You are currently connected as the merchant of this plan. To test subscribing, please switch to a separate subscriber account in your NEAR wallet.
    </p>
  ) : null;

  const walletBar = accountId ? (
    <div className="flex items-center justify-between text-xs text-muted-foreground pt-0.5 px-0.5">
      <span className="flex items-center gap-1.5 min-w-0">
        <span className="text-muted-foreground shrink-0">Wallet:</span>
        <span className="font-mono text-foreground font-medium truncate" title={accountId}>
          {shortAddress(accountId, 6)}
        </span>
      </span>
      <button
        type="button"
        disabled={pending}
        onClick={async () => {
          await wallet.disconnect();
          void wallet.connect();
        }}
        className="text-primary hover:underline font-medium hover:text-foreground cursor-pointer transition-colors disabled:opacity-50 shrink-0 ml-2"
      >
        Change wallet
      </button>
    </div>
  ) : null;

  const actionNode = !reader ? (
    <Button size="lg" disabled>
      NEAR checkout is not configured
    </Button>
  ) : !accountId ? (
    <Button size="lg" disabled={wallet.connecting} onClick={() => void wallet.connect()}>
      {wallet.connecting ? "Connecting…" : "Connect NEAR wallet to subscribe"}
    </Button>
  ) : isOwner && state !== "subscribed" && state !== "past-due" ? (
    <Button
      size="lg"
      variant="secondary"
      className="w-full font-medium border border-border/80 bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground shadow-xs"
      onClick={() => void wallet.disconnect()}
    >
      Disconnect wallet to switch
    </Button>
  ) : !loaded ? (
    <Button size="lg" disabled>
      Checking subscription…
    </Button>
  ) : state === "subscribed" ? (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1 rounded-md border border-success/30 bg-success-soft px-4 py-3 text-success">
        <span className="font-semibold">You&apos;re subscribed</span>
        <span className="text-[13px]">
          {BigInt(subscription!.next_epoch_timestamp_ns) <= BigInt(Date.now()) * BigInt(1_000_000)
            ? "Renewal due"
            : `Next renewal ${formatDateTimeUtc(new Date(Number(BigInt(subscription!.next_epoch_timestamp_ns) / BigInt(1_000_000_000)) * 1000).toISOString())}`}
          {" · "}
          {formatUsdc(BigInt(subscription!.deposited_balance))} USDC prepaid
        </span>
      </div>
      <Button
        size="lg"
        variant="secondary"
        className="w-full font-medium border border-border/80 bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground shadow-xs"
        disabled={pending || required === BigInt(0)}
        onClick={() => void deposit()}
      >
        {pending && action.kind === "deposit" ? "Confirm in your wallet…" : `Top up ${formatUsdc(required)} USDC`}
      </Button>
      <Button
        variant="outline"
        disabled={pending}
        onClick={() => void cancel()}
        className="border-destructive/40 text-destructive hover:bg-destructive hover:text-white dark:hover:text-white transition-colors font-medium"
      >
        {pending && action.kind === "cancel" ? "Cancelling…" : "Cancel subscription"}
      </Button>
      <p className="text-[11px] text-muted-foreground text-center">Instant on-chain cancel · Returns your unused prepaid balance</p>
    </div>
  ) : state === "past-due" ? (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1 rounded-md border border-warning/40 bg-warning-soft px-4 py-3 text-warning">
        <span className="font-semibold">Prepaid balance depleted · Renewal overdue</span>
        <span className="text-[13px]">
          Your prepaid balance is {formatUsdc(BigInt(subscription?.deposited_balance ?? "0"))} USDC. Top up now to renew and maintain your subscription.
        </span>
      </div>
      <Button size="lg" disabled={pending || required === BigInt(0)} onClick={() => void deposit()}>
        {pending && action.kind === "deposit" ? "Confirm in your wallet…" : `Top up ${formatUsdc(required)} USDC to renew`}
      </Button>
      <Button
        variant="outline"
        disabled={pending}
        onClick={() => void cancel()}
        className="border-destructive/40 text-destructive hover:bg-destructive hover:text-white dark:hover:text-white transition-colors font-medium"
      >
        {pending && action.kind === "cancel" ? "Cancelling…" : "Cancel subscription"}
      </Button>
      <p className="text-[11px] text-muted-foreground text-center">Cancelling terminates the subscription on-chain</p>
    </div>
  ) : state === "paused" ? (
    <Button size="lg" disabled>
      This plan is not accepting subscribers
    </Button>
  ) : state === "needs-funds" ? (
    <div className="flex flex-col gap-3">
      <p className="rounded-md border border-warning/40 bg-warning-soft px-3 py-2 text-[13px] text-warning">
        Insufficient USDC balance. You have {formatUsdc(data?.balance ?? BigInt(0))} USDC and need {formatUsdc(required)} USDC for {cycles} cycle{cycles === 1 ? "" : "s"}.
      </p>
      <Button size="lg" disabled>
        Insufficient USDC balance
      </Button>
    </div>
  ) : (
    <Button size="lg" disabled={pending || required === BigInt(0)} onClick={() => void subscribe()}>
      {pending && action.kind === "subscribe" ? "Confirm in your wallet…" : "1-Click Subscribe"}
    </Button>
  );

  const actions = (
    <div className="flex flex-col gap-2.5">
      {actionNode}
      {walletBar}
    </div>
  );

  const footer = (
    <>
      {action.status === "error" && (
        <p role="alert" className="rounded-md border border-destructive/40 px-3 py-2 text-[13px] text-destructive">
          {action.message}
        </p>
      )}
      {action.status === "done" && (
        <p role="status" className="text-xs text-muted-foreground">
          {action.kind === "cancel" && "Subscription cancelled; your unused balance is on its way back. "}
          {action.kind === "deposit" && "Prepaid balance topped up successfully. "}
          {action.hash && (
            <a
              href={nearExplorerUrl("tx", action.hash)}
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1 font-medium"
            >
              View transaction ↗
            </a>
          )}
        </p>
      )}
    </>
  );

  return (
    <CheckoutShell
      name={name}
      priceUsdc={priceUsdc}
      intervalSeconds={intervalSeconds}
      tokenLabel="USDC (NEAR Testnet)"
      extraRows={[
        {
          label: subscription?.is_active ? "Top-up cycles" : "Prepaid cycles",
          value: (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center rounded-md border border-input bg-background/80 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1 focus-within:ring-offset-background transition-all">
                      <button
                        type="button"
                        onClick={() => setCycles((c) => Math.max(MIN_PREPAID_CYCLES, c - 1))}
                        disabled={cycles <= MIN_PREPAID_CYCLES}
                        className="flex size-7 items-center justify-center rounded-l-md text-muted-foreground hover:text-foreground hover:bg-muted/80 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                        aria-label="Decrease cycles"
                      >
                        <Minus className="size-3.5" />
                      </button>
                      <input
                        type="number"
                        min={MIN_PREPAID_CYCLES}
                        max={MAX_PREPAID_CYCLES}
                        value={cycles || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "") {
                            setCycles(1);
                            return;
                          }
                          const parsed = parseInt(val, 10);
                          if (!isNaN(parsed)) {
                            setCycles(Math.max(MIN_PREPAID_CYCLES, Math.min(MAX_PREPAID_CYCLES, parsed)));
                          }
                        }}
                        className="w-10 h-7 bg-transparent text-center font-mono text-sm font-semibold text-foreground outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        aria-label="Prepaid cycles"
                      />
                      <button
                        type="button"
                        onClick={() => setCycles((c) => Math.min(MAX_PREPAID_CYCLES, c + 1))}
                        disabled={cycles >= MAX_PREPAID_CYCLES}
                        className="flex size-7 items-center justify-center rounded-r-md text-muted-foreground hover:text-foreground hover:bg-muted/80 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                        aria-label="Increase cycles"
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                    <span className="text-xs text-muted-foreground font-normal">
                      cycle{cycles === 1 ? "" : "s"}
                    </span>
                  </div>
                ),
              },
            ]}
      ownerNotice={ownerNotice}
      actions={actions}
      explainer="You prepay the cycles above into the TidePay contract. Each renewal is pulled from that balance, and you can cancel any time to get the unused balance back."
      footer={footer}
    />
  );
}
