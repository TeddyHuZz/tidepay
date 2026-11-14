"use client";

import { useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Clock, Loader2, MoveRight } from "lucide-react";
import { CheckoutShell } from "@/components/checkout/checkout-shell";
import { CycleStepper } from "@/components/checkout/cycle-stepper";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/use-subscription";
import { DEVNET_USDC_MINT, explorerUrl } from "@/lib/chain/config";
import { formatUsdc, parseUsdc } from "@/lib/chain/derive";
import { formatCountdown, shortAddress } from "@/lib/format";
import { intervalUnit } from "@/lib/types";
import { cn } from "@/lib/utils";

interface CheckoutCardProps {
  planAddress: string;
  name: string;
  priceUsdc: string;
  intervalSeconds: number;
  active: boolean;
  isSample: boolean;
  merchant?: string;
}

const PRESET_CYCLES = [1, 3, 5, 10];

export function CheckoutCard({ planAddress, name, priceUsdc, intervalSeconds, active, isSample, merchant }: CheckoutCardProps) {
  const { connected, publicKey, disconnect } = useWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();
  const { lookup, action, subscribe, cancel } = useSubscription(isSample ? null : planAddress);

  const [cycles, setCycles] = useState(3);
  const [usdcBalance, setUsdcBalance] = useState<bigint | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  // Real-time 1s ticker for live countdown
  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch live USDC balance on Solana Devnet
  useEffect(() => {
    if (!publicKey || !connection) {
      setUsdcBalance(null);
      return;
    }
    let cancelled = false;
    connection
      .getParsedTokenAccountsByOwner(publicKey, { mint: DEVNET_USDC_MINT })
      .then((res) => {
        if (cancelled) return;
        const raw = res.value[0]?.account.data.parsed.info.tokenAmount.amount;
        setUsdcBalance(raw ? BigInt(raw) : 0n);
      })
      .catch((err) => {
        console.warn("[TidePay] Solana USDC balance read:", err);
        if (!cancelled) setUsdcBalance(0n);
      });
    return () => {
      cancelled = true;
    };
  }, [connection, publicKey]);

  const pending = action.status === "pending";
  const subscribed = lookup.status === "active" || lookup.status === "past_due";
  const isOwner = Boolean(connected && publicKey && merchant && publicKey.toBase58() === merchant);

  const unitPriceParsed = parseUsdc(priceUsdc.replace(/,/g, "")) ?? BigInt(0);
  const required = unitPriceParsed * BigInt(cycles);
  const totalDueUsdc = formatUsdc(required);
  const futureCycles = Math.max(0, cycles - 1);
  const runwayUsdc = formatUsdc(unitPriceParsed * BigInt(futureCycles));
  const userBalanceUsdc = usdcBalance !== null ? formatUsdc(usdcBalance) : "0.00";
  const accountId = publicKey ? publicKey.toBase58() : null;
  const unit = intervalUnit(intervalSeconds);

  // Countdown timer for next Solana pull
  const nextEpochMs = lookup.status === "active" || lookup.status === "past_due" ? Number(lookup.record.nextEpochTimestamp) * 1000 : 0;
  const isDue = nextEpochMs <= nowMs;
  const countdownText = formatCountdown(nextEpochMs, nowMs);

  const handleDisconnect = async () => {
    try {
      await disconnect();
      setVisible(true);
    } catch (err) {
      console.error("[TidePay] Disconnect error:", err);
    }
  };

  const ownerNotice = isOwner ? (
    <p className="rounded-xl border border-warning/40 bg-warning-soft px-4 py-3 text-xs text-warning">
      You are currently connected as the merchant of this plan. To test subscribing, please switch to a separate subscriber wallet in your wallet extension.
    </p>
  ) : null;

  const footerNotices = (
    <>
      {isSample && (
        <p className="rounded-xl border border-warning/40 bg-warning-soft px-3.5 py-2.5 text-xs text-warning">
          This is a sample plan. Subscribing needs a plan created on Devnet.
        </p>
      )}
      {action.status === "error" && (
        <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 px-3.5 py-2.5 text-xs text-destructive">
          {action.message}
        </p>
      )}
      {action.status === "done" && (
        <p role="status" className="text-xs text-muted-foreground">
          {action.kind === "subscribe" && "Subscribed successfully. "}
          {action.kind === "cancel" && "Subscription cancelled; rent refunded to your wallet. "}
          <a
            href={explorerUrl("tx", action.signature)}
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
      chainLabel="SOLANA DEVNET"
      name={name}
      merchant={merchant ?? ""}
      priceUsdc={priceUsdc}
      intervalSeconds={intervalSeconds}
      tokenLabel="USDC (Devnet)"
      cycles={cycles}
      totalDueUsdc={totalDueUsdc}
      protectionText="You approve a recurring allowance once. Each renewal is pulled directly; no funds are held in escrow, and you can cancel anytime on-chain."
      wallet={{
        connected: Boolean(connected && publicKey),
        accountId,
        balanceUsdc: userBalanceUsdc,
        onConnect: () => setVisible(true),
        onChangeWallet: () => void handleDisconnect(),
        connecting: lookup.status === "loading",
      }}
      ownerNotice={ownerNotice}
    >
      <div className="rounded-2xl border border-border bg-card p-6 flex flex-col justify-between shadow-xl min-h-117.5 transition-colors">
        {subscribed ? (
          /* ========================================================= */
          /* ACTIVE SUBSCRIBER VIEW (Image 2 sample design)             */
          /* ========================================================= */
          <div className="flex flex-col gap-5">
            {/* Top Status Card */}
            <div className="rounded-xl border border-border bg-muted/30 p-4.5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border",
                    lookup.status === "past_due"
                      ? "border-warning/40 bg-warning-soft text-warning"
                      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400",
                  )}
                >
                  <span>{lookup.status === "past_due" ? "Renewal Overdue" : "Active Subscription"}</span>
                </div>

                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border bg-background/80 text-xs text-muted-foreground font-mono">
                  <Clock className="size-3.5 text-muted-foreground" />
                  <span>{isDue ? "Next pull: Due now" : `Next pull in ${countdownText}`}</span>
                </div>
              </div>

              <div className="flex items-end justify-between pt-1">
                <div>
                  <div className="text-[11px] text-muted-foreground font-medium">Recurring Billing Rate</div>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-2xl font-extrabold tracking-tight tabular-nums text-foreground">
                      {priceUsdc} USDC
                    </span>
                    <span className="text-xs text-muted-foreground">/ {unit}</span>
                  </div>
                </div>
                <div className="text-[11px] text-muted-foreground font-medium mb-1">Auto-renews via pull</div>
              </div>
            </div>

            {/* Subscription Info */}
            <div className="rounded-xl border border-border bg-muted/20 p-4 flex flex-col gap-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Delegated Pull Authority</span>
                <span className="font-semibold text-foreground">Program PDA (Time-Locked)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Settlement Frequency</span>
                <span className="font-semibold text-foreground">Every {unit}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Wallet USDC Balance</span>
                <span className="font-semibold text-foreground">{userBalanceUsdc} USDC</span>
              </div>
            </div>

            {/* Bottom Account & Cancel Link */}
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 px-0.5">
              <span>Connected: <strong className="font-mono text-foreground font-medium">{shortAddress(accountId ?? "", 6)}</strong></span>
              <button
                type="button"
                disabled={pending}
                onClick={() => void cancel()}
                className="text-destructive/80 hover:text-destructive hover:underline font-medium transition-colors cursor-pointer disabled:opacity-50"
              >
                {pending && action.kind === "cancel" ? "Cancelling…" : "Cancel subscription & revoke authority"}
              </button>
            </div>

            {footerNotices}
          </div>
        ) : (
          /* ========================================================= */
          /* NEW CHECKOUT VIEW (Configurable cycles)                    */
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
            {!connected ? (
              <button
                type="button"
                onClick={() => setVisible(true)}
                className="w-full py-3.5 px-6 rounded-xl font-bold text-sm md:text-base transition-all flex items-center justify-center gap-2 cursor-pointer bg-[#34d399] hover:bg-[#2ecc71] active:scale-[0.99] text-zinc-950 shadow-[0_0_20px_rgba(52,211,153,0.3)]"
              >
                Connect wallet to subscribe <MoveRight className="size-4" />
              </button>
            ) : !active ? (
              <Button size="lg" disabled className="w-full py-4 text-sm font-bold">
                This plan is not accepting subscribers
              </Button>
            ) : isSample ? (
              <Button size="lg" disabled className="w-full py-4 text-sm font-bold">
                Sample plan (read-only)
              </Button>
            ) : usdcBalance !== null && usdcBalance < unitPriceParsed ? (
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  disabled
                  className="w-full py-3.5 px-6 rounded-xl font-bold text-sm md:text-base bg-muted text-muted-foreground cursor-not-allowed border border-border"
                >
                  Insufficient USDC balance (have {userBalanceUsdc} USDC)
                </button>
                <p className="text-[11px] text-muted-foreground text-center">
                  You need at least {priceUsdc} USDC to start this subscription.
                </p>
              </div>
            ) : (
              <button
                type="button"
                disabled={isSample || lookup.status === "loading" || pending}
                onClick={() => void subscribe()}
                className="w-full py-3.5 px-6 rounded-xl font-bold text-sm md:text-base transition-all flex items-center justify-center gap-2 cursor-pointer bg-[#34d399] hover:bg-[#2ecc71] active:scale-[0.99] text-zinc-950 shadow-[0_0_20px_rgba(52,211,153,0.3)] disabled:opacity-50 disabled:pointer-events-none"
              >
                {pending && action.kind === "subscribe" ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Confirm in your wallet…
                  </>
                ) : lookup.status === "loading" ? (
                  "Checking subscription…"
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
