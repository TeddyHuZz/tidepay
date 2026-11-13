"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock, Loader2, MoveRight } from "lucide-react";
import type { SubscriptionRecord } from "@tidepay/sdk-near";
import { CheckoutShell } from "@/components/checkout/checkout-shell";
import { CycleStepper } from "@/components/checkout/cycle-stepper";
import { Button } from "@/components/ui/button";
import { useNearSubscriber } from "@/hooks/use-near-subscriber";
import { formatUsdc, parseUsdc } from "@/lib/chain/derive";
import { formatCountdown, shortAddress } from "@/lib/format";
import { tryCreateNearReader } from "@/lib/near/chain-ops";
import {
  DEFAULT_PREPAID_CYCLES,
  nearCheckoutState,
  prepaidAmount,
} from "@/lib/near/checkout-state";
import { NEAR_CONTRACT_ID, NEAR_USDC_TOKEN_ID, nearExplorerUrl } from "@/lib/near/config";
import { describeNearError } from "@/lib/near/errors";
import { intervalUnit } from "@/lib/types";
import { cn } from "@/lib/utils";

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
  readAtMs: number;
}

const ONE_YOCTO = BigInt(1);
const REREAD_DELAY_MS = 2_000;
const CANCEL_GAS = BigInt(60) * BigInt(10) ** BigInt(12);
const PRESET_CYCLES = [1, 3, 5, 10];

export function NearCheckoutCard({ planId, merchant, name, priceUsdc, intervalSeconds, active }: NearCheckoutCardProps) {
  const wallet = useNearSubscriber();
  const [cycles, setCycles] = useState(DEFAULT_PREPAID_CYCLES);
  const [topUpCycles, setTopUpCycles] = useState(5);
  const [action, setAction] = useState<Action>({ status: "idle" });
  const [view, setView] = useState<{ owner: string; version: number; data: ChainView } | null>(null);
  const [version, setVersion] = useState(0);
  const [nowMs, setNowMs] = useState(() => Date.now());

  // Real-time 1s ticker for live countdown
  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const accountId = wallet.accountId;
  const required = prepaidAmount(priceUsdc, cycles);
  const topUpRequired = prepaidAmount(priceUsdc, topUpCycles);
  const reader = useMemo(() => tryCreateNearReader(), []);

  // Reads on-chain state
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
        args: { receiver_id: NEAR_CONTRACT_ID, amount: topUpRequired.toString(), msg: JSON.stringify({ action: "deposit", plan_id: planId }) },
        deposit: ONE_YOCTO,
      }),
    );

  const cancel = () =>
    run("cancel", () =>
      wallet.callFunction({ contractId: NEAR_CONTRACT_ID, methodName: "cancel_subscription", args: { plan_id: planId }, gas: CANCEL_GAS }),
    );

  const ownerNotice = isOwner ? (
    <p className="rounded-xl border border-warning/40 bg-warning-soft px-4 py-3 text-xs text-warning">
      You are currently connected as the merchant of this plan. To test subscribing, please switch to a separate subscriber account in your NEAR wallet.
    </p>
  ) : null;

  const userBalance = data?.balance ?? BigInt(0);
  const userBalanceUsdc = loaded ? formatUsdc(userBalance) : "0.00";
  const totalDueUsdc = formatUsdc(required);
  const topUpDueUsdc = formatUsdc(topUpRequired);
  const futureCycles = Math.max(0, cycles - 1);
  const unitPriceParsed = parseUsdc(priceUsdc.replace(/,/g, "")) ?? BigInt(0);
  const runwayUsdc = formatUsdc(unitPriceParsed * BigInt(futureCycles));
  const isSubscribed = state === "subscribed" || state === "past-due";
  const unit = intervalUnit(intervalSeconds);

  // Calculation for active subscription runway & countdown
  const depositedBalanceAmt = BigInt(subscription?.deposited_balance ?? "0");
  const depositedBalanceUsdc = formatUsdc(depositedBalanceAmt);
  const remainingCycles = unitPriceParsed > 0n ? Number(depositedBalanceAmt / unitPriceParsed) : 0;
  const nextEpochNs = BigInt(subscription?.next_epoch_timestamp_ns ?? "0");
  const nextEpochMs = Number(nextEpochNs / BigInt(1_000_000));
  const isDue = nextEpochMs <= nowMs;
  const countdownText = formatCountdown(nextEpochMs, nowMs);

  const handleChangeWallet = async () => {
    try {
      await wallet.disconnect();
      void wallet.connect();
    } catch (err) {
      console.error("[TidePay] Change wallet error:", err);
    }
  };

  const footerNotices = (
    <>
      {action.status === "error" && (
        <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 px-3.5 py-2.5 text-xs text-destructive">
          {action.message}
        </p>
      )}
      {action.status === "done" && (
        <p role="status" className="text-xs text-muted-foreground">
          {action.kind === "subscribe" && "Subscribed successfully. "}
          {action.kind === "deposit" && "Prepaid balance topped up successfully. "}
          {action.kind === "cancel" && "Subscription cancelled; unused balance refunded to your wallet. "}
          <a
            href={nearExplorerUrl("tx", action.hash)}
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-1 font-medium ml-1"
          >
            View transaction ↗
          </a>
        </p>
      )}
    </>
  );

  return (
    <CheckoutShell
      chainLabel="NEAR TESTNET"
      name={name}
      merchant={merchant}
      priceUsdc={priceUsdc}
      intervalSeconds={intervalSeconds}
      tokenLabel="USDC (NEAR Testnet)"
      cycles={isSubscribed ? topUpCycles : cycles}
      totalDueUsdc={isSubscribed ? topUpDueUsdc : totalDueUsdc}
      summaryMode={isSubscribed ? "topup" : "subscribe"}
      protectionText="Prepaid cycles stay under your contract allowance. Cancel anytime on-chain to immediately reclaim unused USDC."
      wallet={{
        connected: Boolean(accountId),
        accountId,
        balanceUsdc: userBalanceUsdc,
        onConnect: () => void wallet.connect(),
        onChangeWallet: () => void handleChangeWallet(),
        connecting: wallet.connecting,
      }}
      ownerNotice={ownerNotice}
    >
      <div className="rounded-2xl border border-border bg-card p-6 flex flex-col justify-between shadow-xl min-h-[470px] transition-colors">
        {isSubscribed ? (
          /* ========================================================= */
          /* ACTIVE SUBSCRIBER VIEW (Image 2 sample design)             */
          /* ========================================================= */
          <div className="flex flex-col gap-5">
            {/* Top Status Card */}
            <div className="rounded-xl border border-border bg-muted/30 p-4.5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 text-xs font-semibold">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{state === "past-due" ? "Renewal Overdue" : "Active Subscription"}</span>
                </div>

                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border bg-background/80 text-xs text-muted-foreground font-mono">
                  <Clock className="size-3.5 text-muted-foreground" />
                  <span>{isDue ? "Next pull: Due now" : `Next pull in ${countdownText}`}</span>
                </div>
              </div>

              <div className="flex items-end justify-between pt-1">
                <div>
                  <div className="text-[11px] text-muted-foreground font-medium">Prepaid Runway Balance</div>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-2xl font-extrabold tracking-tight tabular-nums text-foreground">
                      {depositedBalanceUsdc} USDC
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({remainingCycles} cycle{remainingCycles === 1 ? "" : "s"} remaining)
                    </span>
                  </div>
                </div>
                <div className="text-[11px] text-muted-foreground font-medium mb-1">Auto-renews</div>
              </div>

              {/* Segmented Runway Progress Bar */}
              <div className="flex items-center gap-1.5 w-full mt-1.5">
                {Array.from({ length: Math.max(5, remainingCycles) }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-1.5 flex-1 rounded-full transition-colors",
                      i < remainingCycles ? "bg-emerald-500 dark:bg-emerald-400 shadow-xs" : "bg-border/60",
                    )}
                  />
                ))}
              </div>
            </div>

            {/* Extend Prepaid Runway Section */}
            <div className="flex items-center justify-between pt-1">
              <h3 className="text-sm font-semibold text-foreground">Extend prepaid runway</h3>
              <span className="text-xs text-muted-foreground">
                Wallet: <strong className="text-foreground font-semibold tabular-nums">{userBalanceUsdc} USDC</strong>
              </span>
            </div>

            {/* Stepper + Presets Box */}
            <div className="rounded-xl border border-border bg-muted/20 p-4 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-foreground">Add billing cycles</span>
                  <span className="text-[11px] text-muted-foreground">
                    {priceUsdc} USDC per {unit} cycle
                  </span>
                </div>

                <CycleStepper value={topUpCycles} onChange={setTopUpCycles} disabled={pending} />
              </div>

              {/* Quick Presets */}
              <div className="grid grid-cols-4 gap-2">
                {PRESET_CYCLES.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    disabled={pending}
                    onClick={() => setTopUpCycles(preset)}
                    className={cn(
                      "py-2 px-1 text-center text-xs rounded-lg border transition-all cursor-pointer font-medium",
                      topUpCycles === preset
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 shadow-xs"
                        : "border-border bg-background/50 hover:bg-muted text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {preset} cycle{preset > 1 ? "s" : ""}
                  </button>
                ))}
              </div>
            </div>

            {/* Top Up CTA Button */}
            <button
              type="button"
              disabled={pending || topUpRequired === BigInt(0)}
              onClick={() => void deposit()}
              className="w-full py-3.5 px-6 rounded-xl font-bold text-sm md:text-base transition-all flex items-center justify-center gap-2 cursor-pointer bg-[#34d399] hover:bg-[#2ecc71] active:scale-[0.99] text-zinc-950 shadow-[0_0_20px_rgba(52,211,153,0.3)] disabled:opacity-50 disabled:pointer-events-none"
            >
              {pending && action.kind === "deposit" ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Confirm in your wallet…
                </>
              ) : (
                <>
                  Top up {topUpDueUsdc} USDC <MoveRight className="size-4" />
                </>
              )}
            </button>

            {/* Bottom Account & Cancel Link */}
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 px-0.5">
              <span>Connected: <strong className="font-mono text-foreground font-medium">{shortAddress(accountId ?? "", 6)}</strong></span>
              <button
                type="button"
                disabled={pending}
                onClick={() => void cancel()}
                className="text-destructive/80 hover:text-destructive hover:underline font-medium transition-colors cursor-pointer disabled:opacity-50"
              >
                {pending && action.kind === "cancel" ? "Cancelling…" : "Cancel subscription & refund unused USDC"}
              </button>
            </div>

            {footerNotices}
          </div>
        ) : (
          /* ========================================================= */
          /* NEW CHECKOUT VIEW (Configurable prepaid cycles)            */
          /* ========================================================= */
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground">Configure prepaid cycles</h2>
                <p className="text-xs text-muted-foreground mt-1">Choose how many billing cycles to pre-fund. Unused balance is refundable anytime.</p>
              </div>
              <span className="text-xs text-muted-foreground">
                Balance: <strong className="text-foreground font-semibold tabular-nums">{userBalanceUsdc} USDC</strong>
              </span>
            </div>

            {/* Stepper + Presets Box */}
            <div className="rounded-xl border border-border bg-muted/20 p-4.5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-foreground">Initial prepaid cycles</span>
                  <span className="text-[11px] text-muted-foreground">1st cycle settles immediately</span>
                </div>

                <CycleStepper value={cycles} onChange={setCycles} disabled={pending} />
              </div>

              {/* Quick Presets */}
              <div className="grid grid-cols-4 gap-2">
                {PRESET_CYCLES.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    disabled={pending}
                    onClick={() => setCycles(preset)}
                    className={cn(
                      "py-2 px-1 text-center text-xs rounded-lg border transition-all cursor-pointer font-medium",
                      cycles === preset
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 shadow-xs"
                        : "border-border bg-background/50 hover:bg-muted text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {preset} cycle{preset > 1 ? "s" : ""}
                  </button>
                ))}
              </div>
            </div>

            {/* Breakdown */}
            <div className="flex flex-col gap-2.5 text-xs border-y border-border py-3.5">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">First charge (Epoch 1)</span>
                <span className="font-semibold text-foreground tabular-nums">{priceUsdc} USDC today</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Held in prepaid runway</span>
                <span className="font-semibold text-foreground tabular-nums">
                  {runwayUsdc} USDC ({futureCycles} future cycle{futureCycles === 1 ? "" : "s"})
                </span>
              </div>
            </div>

            {/* Big Emerald CTA Button */}
            {!reader ? (
              <Button size="lg" disabled className="w-full py-4 text-sm font-bold">
                NEAR checkout is not configured
              </Button>
            ) : !accountId ? (
              <button
                type="button"
                onClick={() => void wallet.connect()}
                disabled={wallet.connecting}
                className="w-full py-3.5 px-6 rounded-xl font-bold text-sm md:text-base transition-all flex items-center justify-center gap-2 cursor-pointer bg-[#34d399] hover:bg-[#2ecc71] active:scale-[0.99] text-zinc-950 shadow-[0_0_20px_rgba(52,211,153,0.3)] disabled:opacity-50"
              >
                {wallet.connecting ? "Connecting NEAR wallet…" : "Connect NEAR wallet to subscribe"} <MoveRight className="size-4" />
              </button>
            ) : state === "paused" ? (
              <Button size="lg" disabled className="w-full py-4 text-sm font-bold">
                This plan is not accepting subscribers
              </Button>
            ) : state === "needs-funds" ? (
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  disabled
                  className="w-full py-3.5 px-6 rounded-xl font-bold text-sm md:text-base bg-muted text-muted-foreground cursor-not-allowed border border-border"
                >
                  Insufficient USDC balance (have {userBalanceUsdc} USDC)
                </button>
                <p className="text-[11px] text-muted-foreground text-center">
                  You need {totalDueUsdc} USDC to pre-fund {cycles} cycle{cycles === 1 ? "" : "s"}.
                </p>
              </div>
            ) : (
              <button
                type="button"
                disabled={pending || required === BigInt(0)}
                onClick={() => void subscribe()}
                className="w-full py-3.5 px-6 rounded-xl font-bold text-sm md:text-base transition-all flex items-center justify-center gap-2 cursor-pointer bg-[#34d399] hover:bg-[#2ecc71] active:scale-[0.99] text-zinc-950 shadow-[0_0_20px_rgba(52,211,153,0.3)] disabled:opacity-50 disabled:pointer-events-none"
              >
                {pending && action.kind === "subscribe" ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Confirm in your wallet…
                  </>
                ) : (
                  <>
                    Subscribe & Prepay {totalDueUsdc} USDC <MoveRight className="size-4" />
                  </>
                )}
              </button>
            )}

            {footerNotices}
          </div>
        )}
      </div>
    </CheckoutShell>
  );
}
