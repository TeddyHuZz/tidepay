import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, FileCode2, Terminal, Code2, Database, Key, ExternalLink } from "lucide-react";

export const metadata: Metadata = {
  title: "@tidepay/types | IDL & Type Definitions",
  description:
    "Anchor IDL, program addresses, seeds, and TypeScript interfaces for TidePay on Solana.",
};

export default function TypesPage() {
  return (
    <div className="relative min-h-screen py-16 sm:py-24">
      {/* Background ambient glow */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-125 w-200 -translate-x-1/2 rounded-full bg-linear-to-b from-[#9945ff]/15 via-[#5eead4]/10 to-transparent blur-3xl" />
      </div>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Navigation & Header */}
        <div className="mb-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-mono text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Home
          </Link>
          <div className="mt-6 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#9945ff]/20 bg-[#9945ff]/10 px-2.5 py-0.5 text-[11px] font-mono font-medium text-[#9945ff]">
              <FileCode2 className="h-3 w-3" /> Shared IDL &amp; Interfaces
            </span>
            <span className="text-xs font-mono text-zinc-500">v0.1.0</span>
          </div>
          <h1 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-white font-display">
            @tidepay/types
          </h1>
          <p className="mt-3 text-base text-zinc-400 max-w-2xl font-sans leading-relaxed">
            Shared Anchor IDL, account interfaces, error enumerations, and PDA seed constants used across the dashboard, API, and crank bots.
          </p>
        </div>

        {/* Content Body */}
        <div className="space-y-12 text-sm leading-relaxed text-zinc-300 font-sans border-t border-white/8 pt-10">
          {/* Program Constants */}
          <section className="space-y-4">
            <h2 className="text-white font-display text-lg sm:text-xl font-medium">1. Program Constants</h2>
            <div className="rounded-xl border border-white/8 bg-black/50 p-4 font-mono text-xs space-y-2.5 text-zinc-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-white/6 pb-2">
                <span className="text-[#14f195]">TIDEPAY_PROGRAM_ID</span>
                <span className="text-zinc-400 select-all font-mono text-[11px]">DfAycPzXuSu4EzqfAprZ11S8oQZ6nucuRniFNrNaK5CQ</span>
              </div>
              <div className="flex items-center justify-between border-b border-white/6 pb-2">
                <span className="text-[#5eead4]">PLAN_SEED</span>
                <span className="text-zinc-400">&quot;plan&quot;</span>
              </div>
              <div className="flex items-center justify-between border-b border-white/6 pb-2">
                <span className="text-[#5eead4]">SUBSCRIPTION_SEED</span>
                <span className="text-zinc-400">&quot;subscription&quot;</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#5eead4]">AUTH_SEED</span>
                <span className="text-zinc-400">&quot;tidepay_auth&quot;</span>
              </div>
            </div>
          </section>

          {/* Account Interfaces */}
          <section className="space-y-4">
            <h2 className="text-white font-display text-lg sm:text-xl font-medium">2. Account Types</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* MerchantPlan */}
              <div className="rounded-xl border border-white/8 bg-white/2 p-4 space-y-2">
                <span className="font-mono text-xs text-[#00bfb3]">MerchantPlan</span>
                <pre className="font-mono text-[11px] text-zinc-400 bg-black/40 p-3 rounded overflow-x-auto">{`export interface MerchantPlan {
  merchant: string;
  tokenMint: string;
  merchantTokenAccount: string;
  amount: bigint;
  intervalSeconds: bigint;
  planId: string;
  protocolFeeBps: number;
  crankBountyAmount: bigint;
  isActive: boolean;
  bump: number;
}`}</pre>
              </div>

              {/* SubscriptionRecord */}
              <div className="rounded-xl border border-white/8 bg-white/2 p-4 space-y-2">
                <span className="font-mono text-xs text-[#14f195]">SubscriptionRecord</span>
                <pre className="font-mono text-[11px] text-zinc-400 bg-black/40 p-3 rounded overflow-x-auto">{`export interface SubscriptionRecord {
  plan: string;
  subscriber: string;
  subscriberTokenAccount: string;
  startTimestamp: bigint;
  lastEpochTimestamp: bigint;
  nextEpochTimestamp: bigint;
  cycleCount: bigint;
  isActive: boolean;
  bump: number;
}`}</pre>
              </div>
            </div>
          </section>

          {/* Anchor IDL Export */}
          <section className="space-y-4">
            <h2 className="text-white font-display text-lg sm:text-xl font-medium">3. Anchor IDL Integration</h2>
            <p className="text-xs text-zinc-400">
              The package includes the full Anchor IDL JSON so frontend applications and crank bots can instantiate Anchor programs without compiling Rust binaries locally:
            </p>
            <div className="rounded-xl border border-white/8 bg-black/60 p-4 font-mono text-xs text-zinc-300 overflow-x-auto">
              <pre>{`import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { TIDEPAY_IDL, TIDEPAY_PROGRAM_ID } from "@tidepay/types";

const program = new Program(TIDEPAY_IDL as any, provider);`}</pre>
            </div>
          </section>

          {/* Links */}
          <section className="rounded-xl border border-white/8 bg-[#0f1015] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="font-mono text-xs text-[#14f195] block mb-1">Source Repository</span>
              <p className="text-xs text-zinc-400">Inspect the complete IDL specification and TypeScript type declarations.</p>
            </div>
            <a
              href="https://github.com/TeddyHuZz/tidepay/tree/master/packages/types"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-white/12 bg-white/5 px-4 py-2 text-xs font-mono font-medium text-white hover:bg-white/10 transition-colors shrink-0"
            >
              <Terminal className="h-3.5 w-3.5" /> Types on GitHub <ExternalLink className="h-3 w-3" />
            </a>
          </section>
        </div>
      </div>
    </div>
  );
}
