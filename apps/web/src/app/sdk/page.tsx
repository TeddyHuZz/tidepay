import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Box, Terminal, Code2, Cpu, CheckCircle2, ExternalLink } from "lucide-react";

export const metadata: Metadata = {
  title: "@tidepay/sdk | Developer TypeScript Client",
  description:
    "Official TypeScript SDK documentation for TidePay recurring subscription engine on Solana.",
};

export default function SdkPage() {
  return (
    <div className="relative min-h-screen py-16 sm:py-24">
      {/* Background ambient glow */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-125 w-200 -translate-x-1/2 rounded-full bg-linear-to-b from-[#14f195]/15 via-[#9945ff]/10 to-transparent blur-3xl" />
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
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#14f195]/20 bg-[#14f195]/10 px-2.5 py-0.5 text-[11px] font-mono font-medium text-[#14f195]">
              <Box className="h-3 w-3" /> TypeScript Client
            </span>
            <span className="text-xs font-mono text-zinc-500">v0.1.0 · Anchor 0.30+</span>
          </div>
          <h1 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-white font-display">
            @tidepay/sdk
          </h1>
          <p className="mt-3 text-base text-zinc-400 max-w-2xl font-sans leading-relaxed">
            Lightweight, wallet-agnostic client for creating merchant plans, subscribing to delegated recurring payments, and triggering autonomous billing epochs.
          </p>
        </div>

        {/* Content Body */}
        <div className="space-y-12 text-sm leading-relaxed text-zinc-300 font-sans border-t border-white/8 pt-10">
          {/* Quick Install */}
          <section className="space-y-3">
            <h2 className="text-white font-display text-lg sm:text-xl font-medium">Installation</h2>
            <div className="rounded-xl border border-white/8 bg-black/50 p-4 font-mono text-xs text-zinc-300 flex items-center justify-between">
              <code>pnpm add @tidepay/sdk @tidepay/types @solana/web3.js</code>
            </div>
          </section>

          {/* Client Initialization */}
          <section className="space-y-4">
            <h2 className="text-white font-display text-lg sm:text-xl font-medium">1. Initializing TidePayClient</h2>
            <p className="text-xs text-zinc-400">
              The client works with any standard Solana <code className="font-mono text-zinc-300">Connection</code> and optionally accepts a wallet adapter:
            </p>
            <div className="rounded-xl border border-white/8 bg-black/60 p-4 font-mono text-xs text-zinc-300 overflow-x-auto">
              <pre>{`import { Connection } from "@solana/web3.js";
import { TidePayClient } from "@tidepay/sdk";

const connection = new Connection("https://api.devnet.solana.com", "confirmed");
const client = new TidePayClient(connection);`}</pre>
            </div>
          </section>

          {/* Method Reference */}
          <section className="space-y-4">
            <h2 className="text-white font-display text-lg sm:text-xl font-medium">2. Core Method Primitives</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-white/8 bg-white/2 p-4 space-y-2">
                <span className="font-mono text-xs text-[#00bfb3]">PDA Derivation Helpers</span>
                <ul className="text-xs space-y-1 text-zinc-400 font-mono">
                  <li>• client.findMerchantPlanPda(merchant, planId)</li>
                  <li>• client.findSubscriptionPda(plan, subscriber)</li>
                  <li>• client.findProgramAuthorityPda()</li>
                </ul>
              </div>
              <div className="rounded-xl border border-white/8 bg-white/2 p-4 space-y-2">
                <span className="font-mono text-xs text-[#14f195]">Instruction Builders</span>
                <ul className="text-xs space-y-1 text-zinc-400 font-mono">
                  <li>• buildInitializePlanInstruction(params)</li>
                  <li>• buildSubscribeInstruction(params)</li>
                  <li>• buildProcessEpochInstruction(params)</li>
                  <li>• buildCancelSubscriptionInstruction(params)</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Subscribing Example */}
          <section className="space-y-4">
            <h2 className="text-white font-display text-lg sm:text-xl font-medium">3. Building a Subscribe Instruction</h2>
            <p className="text-xs text-zinc-400">
              Return raw <code className="font-mono text-zinc-300">TransactionInstruction</code> objects for seamless transaction composability:
            </p>
            <div className="rounded-xl border border-white/8 bg-black/60 p-4 font-mono text-xs text-zinc-300 overflow-x-auto">
              <pre>{`const { instruction, subscriptionPda } = await client.buildSubscribeInstruction({
  subscriber: wallet.publicKey,
  plan: planPubkey,
  tokenMint: usdcMintPubkey,
  subscriberTokenAccount: subscriberAta,
  merchantTokenAccount: merchantAta,
});

// Bundle into v0 VersionedTransaction or legacy Transaction
tx.add(instruction);`}</pre>
            </div>
          </section>

          {/* Links */}
          <section className="rounded-xl border border-white/8 bg-[#0f1015] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="font-mono text-xs text-[#14f195] block mb-1">Open Source Package</span>
              <p className="text-xs text-zinc-400">Explore full TypeScript implementation and test suites.</p>
            </div>
            <a
              href="https://github.com/TeddyHuZz/tidepay/tree/master/packages/sdk"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-white/12 bg-white/5 px-4 py-2 text-xs font-mono font-medium text-white hover:bg-white/10 transition-colors shrink-0"
            >
              <Terminal className="h-3.5 w-3.5" /> SDK on GitHub <ExternalLink className="h-3 w-3" />
            </a>
          </section>
        </div>
      </div>
    </div>
  );
}
