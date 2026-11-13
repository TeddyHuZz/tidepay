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
  summaryMode?: "subscribe" | "topup";
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
  summaryMode = "subscribe",
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
    <div className="min-h-dvh bg-background text-foreground relative flex flex-col font-sans transition-colors duration-200">
      {/* High-tech web3 background grid (adaptive to light/dark, no radial glow) */}
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,currentColor_1px,transparent_1px),linear-gradient(to_bottom,currentColor_1px,transparent_1px)] opacity-[0.035] bg-[size:32px_32px]"
        aria-hidden="true"
      />

      {/* Top Navbar */}
      <header className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
            <LogoMark />
            <span className="text-lg font-bold tracking-tight text-foreground">TidePay</span>
          </Link>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono tracking-wider font-semibold border border-primary/30 bg-primary/10 text-primary uppercase">
            {chainLabel}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {wallet.connected && wallet.accountId ? (
            <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs text-foreground shadow-xs">
              <span className="size-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
              <span className="font-mono font-medium">{walletDisplay}</span>
              <span className="text-muted-foreground/60">|</span>
              <span className="font-semibold tabular-nums text-foreground">{wallet.balanceUsdc ?? "0.00"} USDC</span>
            </div>
          ) : null}

          {wallet.connected ? (
            <button
              type="button"
              onClick={wallet.onChangeWallet}
              className="rounded-lg border border-border bg-card hover:bg-muted px-3 py-1.5 text-xs font-medium text-foreground transition-colors cursor-pointer"
            >
              Change wallet
            </button>
          ) : (
            <button
              type="button"
              onClick={wallet.onConnect}
              disabled={wallet.connecting}
              className="rounded-lg border border-primary/40 bg-primary/10 hover:bg-primary/20 px-3.5 py-1.5 text-xs font-semibold text-primary transition-colors cursor-pointer disabled:opacity-50"
            >
              {wallet.connecting ? "Connecting…" : "Connect wallet"}
            </button>
          )}

          <ThemeToggle className="size-8 rounded-lg border-border" />
        </div>
      </header>

      {/* Tagline row (without manual toggle buttons) */}
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 pt-2 pb-3 flex items-center justify-between text-xs text-muted-foreground relative z-10">
        <div className="flex items-center gap-1.5 font-medium">
          <Lock className="size-3.5 text-muted-foreground" />
          <span>Non-custodial recurring billing protocol</span>
        </div>
      </div>

      {/* Main Two-Column Checkout View */}
      <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 pb-20 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start relative z-10">
        {/* Left Column: Plan Summary Card */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="rounded-2xl border border-border bg-card p-6 flex flex-col justify-between shadow-xl transition-colors">
            {/* Merchant Pill */}
            {merchant ? (
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-muted/60 border border-border text-xs text-foreground w-fit mb-4">
                <span className="size-4 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[10px]">
                  {merchantInitial}
                </span>
                <span className="font-mono text-muted-foreground">{merchantDisplay}</span>
                <CheckCircle2 className="size-3.5 text-emerald-500 fill-emerald-500/20" />
              </div>
            ) : null}

            {/* Title & Description */}
            <h1 className="text-2xl font-bold tracking-tight text-foreground mb-1.5">{name}</h1>
            <p className="text-xs text-muted-foreground leading-relaxed mb-6">
              {description || "Automated recurring access with non-custodial prepaid cycle protection."}
            </p>

            {/* Price Display */}
            <div className="flex items-baseline gap-2 pb-6 border-b border-border">
              <span className="text-4xl font-extrabold tracking-tight tabular-nums text-foreground">{priceUsdc}</span>
              <span className="text-sm font-medium text-muted-foreground">USDC / {unit}</span>
            </div>

            {/* Spec List */}
            <dl className="flex flex-col gap-3 py-4 text-xs">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Billed every</dt>
                <dd className="font-medium text-foreground">{unit}</dd>
              </div>

              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Settlement token</dt>
                <dd className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-secondary border border-border text-xs text-secondary-foreground font-medium">
                  <span className="size-3.5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">
                    $
                  </span>
                  <span>{tokenLabel}</span>
                </dd>
              </div>

              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">{summaryMode === "topup" ? "Top-up cycles" : "Selected cycles"}</dt>
                <dd className="font-medium text-foreground">
                  {cycles} × {priceUsdc} USDC
                </dd>
              </div>

              <div className="h-px bg-border my-1" />

              <div className="flex items-center justify-between">
                <dt className="text-sm font-semibold text-foreground">
                  {summaryMode === "topup" ? "Top-up total" : "Total due today"}
                </dt>
                <dd className="text-base font-bold tabular-nums text-foreground">{totalDueUsdc} USDC</dd>
              </div>
            </dl>

            {/* Non-Custodial Protection Banner */}
            <div className="rounded-xl border border-border bg-muted/40 p-4 flex items-start gap-3 mt-4">
              <ShieldCheck className="size-5 text-emerald-500 shrink-0 mt-0.5" />
              <p className="text-xs leading-relaxed text-muted-foreground">
                <strong className="text-foreground font-semibold">100% Non-Custodial Protection.</strong>{" "}
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
    <div className="min-h-dvh bg-background text-foreground relative flex flex-col font-sans">
      <header className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LogoMark />
          <span className="text-lg font-bold tracking-tight text-foreground">TidePay</span>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono tracking-wider font-semibold border border-primary/30 bg-primary/10 text-primary uppercase">
            {chainLabel}
          </span>
        </div>
      </header>
      <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 h-[480px] rounded-2xl border border-border bg-card/60 animate-pulse" />
        <div className="lg:col-span-7 h-[480px] rounded-2xl border border-border bg-card/60 animate-pulse" />
      </main>
    </div>
  );
}
