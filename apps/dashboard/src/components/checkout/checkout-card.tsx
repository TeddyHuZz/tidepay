"use client";

import { useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { CheckCircle2, Loader2, Minus, MoveRight, Plus } from "lucide-react";
import { CheckoutShell } from "@/components/checkout/checkout-shell";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/use-subscription";
import { DEVNET_USDC_MINT, explorerUrl } from "@/lib/chain/config";
import { formatUsdc, parseUsdc } from "@/lib/chain/derive";
import { formatDateTimeUtc } from "@/lib/format";
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
        <p role="status" className="text-xs text-zinc-400">
          {action.kind === "subscribe" && "Subscribed successfully. "}
          {action.kind === "cancel" && "Subscription cancelled; rent refunded to your wallet. "}
          <a
            href={explorerUrl("tx", action.signature)}
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
      <div className="rounded-2xl border border-white/10 bg-[#0e1317]/90 backdrop-blur-md p-6 flex flex-col justify-between shadow-2xl min-h-[460px]">
        {subscribed ? (
          /* ========================================================= */
          /* ACTIVE SUBSCRIBER VIEW (Automatic via on-chain state)      */
          /* ========================================================= */
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white">Manage subscription</h2>
                <p className="text-xs text-zinc-400 mt-1">Your subscription is active on-chain. Cancel anytime to revoke pull authority.</p>
              </div>
              <span className="text-xs text-zinc-400">
                Balance: <strong className="text-zinc-200 font-semibold tabular-nums">{userBalanceUsdc} USDC</strong>
              </span>
            </div>

            {/* Status Banner */}
            <div
              className={cn(
                "flex items-start gap-3 rounded-xl p-4 border",
                lookup.status === "past_due"
                  ? "border-warning/40 bg-warning-soft text-warning"
                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
              )}
            >
              <CheckCircle2
                className={cn("size-5 shrink-0 mt-0.5", lookup.status === "past_due" ? "text-warning" : "text-emerald-400")}
              />
              <div className="flex flex-col gap-0.5">
                <span className="font-bold text-sm">
                  {lookup.status === "past_due" ? "Subscribed, renewal overdue" : "You're subscribed"}
                </span>
                <span className="text-xs text-zinc-300">
                  Next renewal {formatDateTimeUtc(new Date(Number(lookup.record.nextEpochTimestamp) * 1000).toISOString())}
                </span>
              </div>
            </div>

            {/* Cancel Subscription */}
            <div className="flex flex-col gap-2 pt-4">
              <Button
                variant="outline"
                disabled={pending}
                onClick={() => void cancel()}
                className="w-full border-red-500/40 text-red-400 hover:bg-red-500 hover:text-white transition-colors font-medium cursor-pointer"
              >
                {pending && action.kind === "cancel" ? "Cancelling…" : "Cancel subscription"}
              </Button>
              <p className="text-[11px] text-zinc-500 text-center">
                Instant on-chain revocation · Returns ~0.0015 SOL rent to your wallet
              </p>
            </div>

            {footerNotices}
          </div>
        ) : (
          /* ========================================================= */
          /* NEW CHECKOUT VIEW (Configurable cycles)                    */
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
                    disabled={cycles <= 1 || pending}
                    onClick={() => setCycles((c) => Math.max(1, c - 1))}
                    className="size-7 rounded-md flex items-center justify-center hover:bg-white/10 text-zinc-400 hover:text-white transition-colors disabled:opacity-30 cursor-pointer"
                  >
                    <Minus className="size-3.5" />
                  </button>
                  <span className="w-9 text-center font-bold text-sm tabular-nums text-white">{cycles}</span>
                  <button
                    type="button"
                    disabled={cycles >= 100 || pending}
                    onClick={() => setCycles((c) => Math.min(100, c + 1))}
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
            {!connected ? (
              <button
                type="button"
                onClick={() => setVisible(true)}
                className="w-full py-3.5 px-6 rounded-xl font-bold text-sm md:text-base transition-all flex items-center justify-center gap-2 cursor-pointer bg-[#34d399] hover:bg-[#2ecc71] active:scale-[0.99] text-zinc-950 shadow-[0_0_25px_rgba(52,211,153,0.35)]"
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
                  className="w-full py-3.5 px-6 rounded-xl font-bold text-sm md:text-base bg-white/10 text-zinc-400 cursor-not-allowed"
                >
                  Insufficient USDC balance (have {userBalanceUsdc} USDC)
                </button>
                <p className="text-[11px] text-zinc-400 text-center">
                  You need at least {priceUsdc} USDC to start this subscription.
                </p>
              </div>
            ) : (
              <button
                type="button"
                disabled={isSample || lookup.status === "loading" || pending}
                onClick={() => void subscribe()}
                className="w-full py-3.5 px-6 rounded-xl font-bold text-sm md:text-base transition-all flex items-center justify-center gap-2 cursor-pointer bg-[#34d399] hover:bg-[#2ecc71] active:scale-[0.99] text-zinc-950 shadow-[0_0_25px_rgba(52,211,153,0.35)] disabled:opacity-50 disabled:pointer-events-none"
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
