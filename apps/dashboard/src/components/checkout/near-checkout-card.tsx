"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, Minus, MoveRight, Plus } from "lucide-react";
import type { SubscriptionRecord } from "@tidepay/sdk-near";
import { CheckoutShell } from "@/components/checkout/checkout-shell";
import { Button } from "@/components/ui/button";
import { useNearSubscriber } from "@/hooks/use-near-subscriber";
import { formatUsdc, parseUsdc } from "@/lib/chain/derive";
import { formatDateTimeUtc } from "@/lib/format";
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
const TOPUP_PRESETS = [1, 2, 3, 5];

export function NearCheckoutCard({ planId, merchant, name, priceUsdc, intervalSeconds, active }: NearCheckoutCardProps) {
  const wallet = useNearSubscriber();
  const [cycles, setCycles] = useState(DEFAULT_PREPAID_CYCLES);
  const [topUpCycles, setTopUpCycles] = useState(2);
  const [action, setAction] = useState<Action>({ status: "idle" });
  const [view, setView] = useState<{ owner: string; version: number; data: ChainView } | null>(null);
  const [version, setVersion] = useState(0);

  const accountId = wallet.accountId;
  const required = prepaidAmount(priceUsdc, cycles);
  const topUpRequired = prepaidAmount(priceUsdc, topUpCycles);
  const reader = useMemo(() => tryCreateNearReader(), []);

  // Reads what this wallet has on chain.
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
  const futureCycles = Math.max(0, cycles - 1);
  const unitPriceParsed = parseUsdc(priceUsdc.replace(/,/g, "")) ?? BigInt(0);
  const runwayUsdc = formatUsdc(unitPriceParsed * BigInt(futureCycles));
  const isSubscribed = state === "subscribed" || state === "past-due";

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
        <p role="status" className="text-xs text-zinc-400">
          {action.kind === "subscribe" && "Subscribed successfully. "}
          {action.kind === "deposit" && "Prepaid balance topped up successfully. "}
          {action.kind === "cancel" && "Subscription cancelled; unused balance refunded to your wallet. "}
          <a
            href={nearExplorerUrl("tx", action.hash)}
            target="_blank"
            rel="noreferrer"
            className="text-emerald-400 hover:underline inline-flex items-center gap-1 font-medium ml-1"
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
      cycles={isSubscribed ? (subscription ? subscription.cycle_count : 1) : cycles}
      totalDueUsdc={isSubscribed ? priceUsdc : totalDueUsdc}
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
      <div className="rounded-2xl border border-white/10 bg-[#0e1317]/90 backdrop-blur-md p-6 flex flex-col justify-between shadow-2xl min-h-[460px]">
        {isSubscribed ? (
          /* ========================================================= */
          /* ACTIVE SUBSCRIBER VIEW (Automatic via on-chain state)      */
          /* ========================================================= */
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white">Manage subscription</h2>
                <p className="text-xs text-zinc-400 mt-1">Your subscription is active on-chain. Top up or cancel anytime.</p>
              </div>
              <span className="text-xs text-zinc-400">
                Balance: <strong className="text-zinc-200 font-semibold tabular-nums">{userBalanceUsdc} USDC</strong>
              </span>
            </div>

            {/* Status Banner */}
            {state === "past-due" ? (
              <div className="flex flex-col gap-1 rounded-xl border border-warning/40 bg-warning-soft px-4 py-3.5 text-warning">
                <span className="font-semibold text-sm">Prepaid balance depleted · Renewal overdue</span>
                <span className="text-xs leading-relaxed">
                  Your prepaid balance is {formatUsdc(BigInt(subscription?.deposited_balance ?? "0"))} USDC. Top up now to renew and maintain your subscription.
                </span>
              </div>
            ) : (
              <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-400">
                <CheckCircle2 className="size-5 shrink-0 mt-0.5 text-emerald-400" />
                <div className="flex flex-col gap-0.5">
                  <span className="font-bold text-sm text-emerald-400">You&apos;re subscribed</span>
                  <span className="text-xs text-zinc-300">
                    {subscription && BigInt(subscription.next_epoch_timestamp_ns) <= BigInt(Date.now()) * BigInt(1_000_000)
                      ? "Renewal due"
                      : `Next renewal ${formatDateTimeUtc(new Date(Number(BigInt(subscription?.next_epoch_timestamp_ns ?? "0") / BigInt(1_000_000_000)) * 1000).toISOString())}`}
                    {" · "}
                    <strong className="text-emerald-300 font-semibold">{formatUsdc(BigInt(subscription?.deposited_balance ?? "0"))} USDC</strong> prepaid
                  </span>
                </div>
              </div>
            )}

            {/* Top-up cycles box */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-zinc-200">Top-up prepaid cycles</span>
                  <span className="text-[11px] text-zinc-400">Add runway to prevent subscription lapse</span>
                </div>
                <div className="flex items-center rounded-lg border border-white/10 bg-black/40 p-1">
                  <button
                    type="button"
                    disabled={topUpCycles <= MIN_PREPAID_CYCLES || pending}
                    onClick={() => setTopUpCycles((c) => Math.max(MIN_PREPAID_CYCLES, c - 1))}
                    className="size-7 rounded-md flex items-center justify-center hover:bg-white/10 text-zinc-400 hover:text-white transition-colors disabled:opacity-30 cursor-pointer"
                  >
                    <Minus className="size-3.5" />
                  </button>
                  <span className="w-9 text-center font-bold text-sm tabular-nums text-white">{topUpCycles}</span>
                  <button
                    type="button"
                    disabled={topUpCycles >= MAX_PREPAID_CYCLES || pending}
                    onClick={() => setTopUpCycles((c) => Math.min(MAX_PREPAID_CYCLES, c + 1))}
                    className="size-7 rounded-md flex items-center justify-center hover:bg-white/10 text-zinc-400 hover:text-white transition-colors disabled:opacity-30 cursor-pointer"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
              </div>

              {/* Preset buttons */}
              <div className="grid grid-cols-4 gap-2">
                {TOPUP_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    disabled={pending}
                    onClick={() => setTopUpCycles(preset)}
                    className={cn(
                      "py-2 px-1 text-center text-xs rounded-lg border transition-all cursor-pointer font-medium",
                      topUpCycles === preset
                        ? "border-emerald-500/80 bg-emerald-500/10 text-emerald-400 shadow-sm"
                        : "border-white/10 bg-black/20 hover:border-white/20 text-zinc-400 hover:text-zinc-200",
                    )}
                  >
                    {preset} cycle{preset > 1 ? "s" : ""}
                  </button>
                ))}
              </div>

              <Button
                size="lg"
                variant="secondary"
                disabled={pending || topUpRequired === BigInt(0)}
                onClick={() => void deposit()}
                className="w-full font-semibold border border-white/10 bg-[#161d24] text-white hover:bg-[#1d2731] transition-all cursor-pointer"
              >
                {pending && action.kind === "deposit"
                  ? "Confirm in your wallet…"
                  : `Top up ${formatUsdc(topUpRequired)} USDC${state === "past-due" ? " to renew" : ""}`}
              </Button>
            </div>

            {/* Cancel Subscription */}
            <div className="flex flex-col gap-2 pt-2">
              <Button
                variant="outline"
                disabled={pending}
                onClick={() => void cancel()}
                className="border-red-500/40 text-red-400 hover:bg-red-500 hover:text-white transition-colors font-medium cursor-pointer"
              >
                {pending && action.kind === "cancel" ? "Cancelling…" : "Cancel subscription"}
              </Button>
              <p className="text-[11px] text-zinc-500 text-center">Instant on-chain cancel · Returns your unused prepaid balance</p>
            </div>

            {footerNotices}
          </div>
        ) : (
          /* ========================================================= */
          /* NEW CHECKOUT VIEW (Configurable prepaid cycles)            */
          /* ========================================================= */
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white">Configure prepaid cycles</h2>
                <p className="text-xs text-zinc-400 mt-1">Choose how many billing cycles to pre-fund. Unused balance is refundable anytime.</p>
              </div>
              <span className="text-xs text-zinc-400">
                Balance: <strong className="text-zinc-200 font-semibold tabular-nums">{userBalanceUsdc} USDC</strong>
              </span>
            </div>

            {/* Stepper + Presets Box */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4.5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-zinc-200">Initial prepaid cycles</span>
                  <span className="text-[11px] text-zinc-400">1st cycle settles immediately</span>
                </div>

                <div className="flex items-center rounded-lg border border-white/10 bg-black/40 p-1">
                  <button
                    type="button"
                    disabled={cycles <= MIN_PREPAID_CYCLES || pending}
                    onClick={() => setCycles((c) => Math.max(MIN_PREPAID_CYCLES, c - 1))}
                    className="size-7 rounded-md flex items-center justify-center hover:bg-white/10 text-zinc-400 hover:text-white transition-colors disabled:opacity-30 cursor-pointer"
                  >
                    <Minus className="size-3.5" />
                  </button>
                  <span className="w-9 text-center font-bold text-sm tabular-nums text-white">{cycles}</span>
                  <button
                    type="button"
                    disabled={cycles >= MAX_PREPAID_CYCLES || pending}
                    onClick={() => setCycles((c) => Math.min(MAX_PREPAID_CYCLES, c + 1))}
                    className="size-7 rounded-md flex items-center justify-center hover:bg-white/10 text-zinc-400 hover:text-white transition-colors disabled:opacity-30 cursor-pointer"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
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
                        ? "border-emerald-500/80 bg-emerald-500/10 text-emerald-400 shadow-sm"
                        : "border-white/10 bg-black/20 hover:border-white/20 text-zinc-400 hover:text-zinc-200",
                    )}
                  >
                    {preset} cycle{preset > 1 ? "s" : ""}
                  </button>
                ))}
              </div>
            </div>

            {/* Breakdown */}
            <div className="flex flex-col gap-2.5 text-xs border-y border-white/10 py-3.5">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">First charge (Epoch 1)</span>
                <span className="font-semibold text-zinc-200 tabular-nums">{priceUsdc} USDC today</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Held in prepaid runway</span>
                <span className="font-semibold text-zinc-200 tabular-nums">
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
                className="w-full py-3.5 px-6 rounded-xl font-bold text-sm md:text-base transition-all flex items-center justify-center gap-2 cursor-pointer bg-[#34d399] hover:bg-[#2ecc71] active:scale-[0.99] text-zinc-950 shadow-[0_0_25px_rgba(52,211,153,0.35)] disabled:opacity-50"
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
                  className="w-full py-3.5 px-6 rounded-xl font-bold text-sm md:text-base bg-white/10 text-zinc-400 cursor-not-allowed"
                >
                  Insufficient USDC balance (have {userBalanceUsdc} USDC)
                </button>
                <p className="text-[11px] text-zinc-400 text-center">
                  You need {totalDueUsdc} USDC to pre-fund {cycles} cycle{cycles === 1 ? "" : "s"}.
                </p>
              </div>
            ) : (
              <button
                type="button"
                disabled={pending || required === BigInt(0)}
                onClick={() => void subscribe()}
                className="w-full py-3.5 px-6 rounded-xl font-bold text-sm md:text-base transition-all flex items-center justify-center gap-2 cursor-pointer bg-[#34d399] hover:bg-[#2ecc71] active:scale-[0.99] text-zinc-950 shadow-[0_0_25px_rgba(52,211,153,0.35)] disabled:opacity-50 disabled:pointer-events-none"
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
