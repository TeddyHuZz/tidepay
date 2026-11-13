"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { CheckCircle2, Lock, ShieldCheck } from "lucide-react";
import { LogoMark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { intervalUnit } from "@/lib/types";
import { shortAddress } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface CheckoutWalletBar {
  connected: boolean;
  accountId: string | null;
  balanceUsdc: string | null;
  onConnect: () => void;
  onChangeWallet: () => void;
  connecting?: boolean;
}

export interface CheckoutShellProps {
  chainLabel: string;
  name: string;
  merchant: string;
  priceUsdc: string;
  intervalSeconds: number;
  tokenLabel: string;
  description?: string;
  protectionText?: string;
  cycles: number;
  totalDueUsdc: string;
  wallet: CheckoutWalletBar;
  ownerNotice?: ReactNode;
  children: ReactNode;
}

export function CheckoutShell({
  chainLabel,
  name,
  merchant,
  priceUsdc,
  intervalSeconds,
  tokenLabel,
  description,
  protectionText,
  cycles,
  totalDueUsdc,
  wallet,
  ownerNotice,
  children,
}: CheckoutShellProps) {
  const unit = intervalUnit(intervalSeconds);
  const merchantInitial = (merchant.charAt(0) || "M").toUpperCase();
  const merchantDisplay = merchant.length <= 18 ? merchant : shortAddress(merchant, 6);
  const walletDisplay = wallet.accountId
    ? wallet.accountId.length <= 18
      ? wallet.accountId
      : shortAddress(wallet.accountId, 6)
    : "";

  return (
    <div className="min-h-dvh bg-[#090d10] text-foreground relative flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* High-tech web3 background grid */}
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:32px_32px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(52,211,153,0.06)_0%,transparent_60%)]"
        aria-hidden="true"
      />

      {/* Top Navbar */}
      <header className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
            <LogoMark />
            <span className="text-lg font-bold tracking-tight text-white">TidePay</span>
          </Link>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono tracking-wider font-semibold border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 uppercase">
            {chainLabel}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {wallet.connected && wallet.accountId ? (
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-[#12171c]/90 px-3.5 py-1.5 text-xs text-zinc-200 shadow-inner">
              <span className="size-2 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
              <span className="font-mono font-medium">{walletDisplay}</span>
              <span className="text-zinc-600">|</span>
              <span className="font-semibold tabular-nums text-white">{wallet.balanceUsdc ?? "0.00"} USDC</span>
            </div>
          ) : null}

          {wallet.connected ? (
            <button
              type="button"
              onClick={wallet.onChangeWallet}
              className="rounded-lg border border-white/10 bg-[#12171c]/70 hover:bg-[#12171c] hover:border-white/20 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              Change wallet
            </button>
          ) : (
            <button
              type="button"
              onClick={wallet.onConnect}
              disabled={wallet.connecting}
              className="rounded-lg border border-white/10 bg-[#12171c] hover:bg-[#181f26] px-3.5 py-1.5 text-xs font-semibold text-white transition-colors cursor-pointer disabled:opacity-50"
            >
              {wallet.connecting ? "Connecting…" : "Connect wallet"}
            </button>
          )}

          <ThemeToggle className="size-8 rounded-lg" />
        </div>
      </header>

      {/* Tagline row (without manual view toggle buttons) */}
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 pt-3 pb-3 flex items-center justify-between text-xs text-zinc-400 relative z-10">
        <div className="flex items-center gap-1.5 text-zinc-400 font-medium">
          <Lock className="size-3.5 text-zinc-400" />
          <span>Non-custodial recurring billing protocol</span>
        </div>
      </div>

      {/* Main Two-Column Checkout View */}
      <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 pb-20 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start relative z-10">
        {/* Left Column: Plan Summary Card */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="rounded-2xl border border-white/10 bg-[#0e1317]/90 backdrop-blur-md p-6 flex flex-col justify-between shadow-2xl">
            {/* Merchant Pill */}
            {merchant ? (
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/10 text-xs text-zinc-200 w-fit mb-4">
                <span className="size-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px]">
                  {merchantInitial}
                </span>
                <span className="font-mono text-zinc-300">{merchantDisplay}</span>
                <CheckCircle2 className="size-3.5 text-emerald-400 fill-emerald-400/20" />
              </div>
            ) : null}

            {/* Title & Description */}
            <h1 className="text-2xl font-bold tracking-tight text-white mb-1.5">{name}</h1>
            <p className="text-xs text-zinc-400 leading-relaxed mb-6">
              {description || "Automated recurring access with non-custodial prepaid cycle protection."}
            </p>

            {/* Price Display */}
            <div className="flex items-baseline gap-2 pb-6 border-b border-white/10">
              <span className="text-4xl font-extrabold tracking-tight tabular-nums text-white">{priceUsdc}</span>
              <span className="text-sm font-medium text-zinc-400">USDC / {unit}</span>
            </div>

            {/* Spec List */}
            <dl className="flex flex-col gap-3 py-4 text-xs">
              <div className="flex items-center justify-between">
                <dt className="text-zinc-400">Billed every</dt>
                <dd className="font-medium text-zinc-200">{unit}</dd>
              </div>

              <div className="flex items-center justify-between">
                <dt className="text-zinc-400">Settlement token</dt>
                <dd className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/5 text-xs text-zinc-200 font-medium">
                  <span className="size-3.5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[10px] font-bold">
                    $
                  </span>
                  <span>{tokenLabel}</span>
                </dd>
              </div>

              <div className="flex items-center justify-between">
                <dt className="text-zinc-400">Selected cycles</dt>
                <dd className="font-medium text-zinc-200">
                  {cycles} × {priceUsdc} USDC
                </dd>
              </div>

              <div className="h-px bg-white/10 my-1" />

              <div className="flex items-center justify-between">
                <dt className="text-sm font-semibold text-zinc-200">Total due today</dt>
                <dd className="text-base font-bold tabular-nums text-white">{totalDueUsdc} USDC</dd>
              </div>
            </dl>

            {/* Non-Custodial Protection Banner */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 flex items-start gap-3 mt-4">
              <ShieldCheck className="size-5 text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-xs leading-relaxed text-zinc-400">
                <strong className="text-zinc-200 font-semibold">100% Non-Custodial Protection.</strong>{" "}
                {protectionText ||
                  "Prepaid cycles stay under your contract allowance. Cancel anytime on-chain to immediately reclaim unused USDC."}
              </p>
            </div>
          </div>

          {ownerNotice}
        </div>

        {/* Right Column: Interactive Configuration or Subscriber Card */}
        <div className="lg:col-span-7">{children}</div>
      </main>
    </div>
  );
}

export function CheckoutLoadingSkeleton({ chainLabel }: { chainLabel: string }) {
  return (
    <div className="min-h-dvh bg-[#090d10] text-foreground relative flex flex-col font-sans">
      <header className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LogoMark />
          <span className="text-lg font-bold tracking-tight text-white">TidePay</span>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono tracking-wider font-semibold border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 uppercase">
            {chainLabel}
          </span>
        </div>
      </header>
      <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 h-[480px] rounded-2xl border border-white/10 bg-[#0e1317]/50 animate-pulse" />
        <div className="lg:col-span-7 h-[480px] rounded-2xl border border-white/10 bg-[#0e1317]/50 animate-pulse" />
      </main>
    </div>
  );
}
