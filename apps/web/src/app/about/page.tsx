import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Users,
  Terminal,
  ShieldCheck,
  Zap,
  Globe2,
  Code2,
  ExternalLink,
  Flame,
  Award,
} from "lucide-react";

export const metadata: Metadata = {
  title: "About Us | TidePay Team & Developers",
  description:
    "Meet the developers and architects behind TidePay, the non-custodial recurring subscription engine built for the Colosseum Hackathon on Solana.",
};

export default function AboutPage() {
  return (
    <div className="relative min-h-screen py-16 sm:py-24">
      {/* Background ambient glow */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-125 w-200 -translate-x-1/2 rounded-full bg-linear-to-b from-[#14f195]/10 via-[#00bfb3]/5 to-transparent blur-3xl" />
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
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#00bfb3]/20 bg-[#00bfb3]/10 px-2.5 py-0.5 text-[11px] font-mono font-medium text-[#00bfb3]">
              <Users className="h-3 w-3" /> Core Team & Vision
            </span>
            <span className="text-xs font-mono text-zinc-500">Colosseum Hackathon 2026</span>
          </div>
          <h1 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-white font-display">
            Building the Recurring Billing Engine for Solana
          </h1>
          <p className="mt-3 text-base text-zinc-400 max-w-2xl font-sans leading-relaxed">
            TidePay was founded with a singular conviction: recurring commerce on Web3 should never require custodial escrow vaults, wrapped bridge risks, or manual monthly signatures.
          </p>
        </div>

        {/* Content Body */}
        <div className="space-y-14 text-sm leading-relaxed text-zinc-300 font-sans border-t border-white/8 pt-10">
          {/* Mission Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2.5 text-white font-display text-lg sm:text-xl font-medium">
              <Zap className="h-5 w-5 text-[#14f195]" />
              <h2>Our Mission</h2>
            </div>
            <p>
              Traditional SaaS relies on credit card networks to pull payments automatically. While blockchains offer instant finality and self-custody, recurring subscriptions were historically hindered by a false choice: either surrender your funds to centralized custodians, or demand users sign manual approval transactions every 30 days.
            </p>
            <p>
              TidePay solves this with <strong>delegated pull authority</strong> and <strong>autonomous keeper cranks</strong>. Subscribers approve a one-time token allowance, and decentralized keepers settle payments precisely when time-locked on-chain epochs elapse.
            </p>
          </section>

          {/* Hackathon Origins */}
          <section className="rounded-2xl border border-white/8 bg-[#0f1015]/80 p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-2 text-xs font-mono text-[#00bfb3]">
              <Award className="h-4 w-4" /> Colosseum Hackathon 2026
            </div>
            <h3 className="text-xl font-semibold text-white font-display">Built for the Global Solana Ecosystem</h3>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              TidePay was engineered from day one as a production-grade, non-custodial protocol for the Colosseum Hackathon. Every architectural decision—from Anchor 0.30+ program safety, SPL Token-2022 checked transfers, sub-second crank concurrency, and Solana Actions/Blinks compatibility—was made to empower developers, merchants, and creators worldwide.
            </p>
          </section>

          {/* Team & Contributors */}
          <section className="space-y-6">
            <div className="flex items-center gap-2.5 text-white font-display text-lg sm:text-xl font-medium">
              <Code2 className="h-5 w-5 text-[#9945ff]" />
              <h2>Developers &amp; Contributors</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* TeddyHuZz Card */}
              <div className="rounded-xl border border-white/8 bg-white/2 p-5 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-white">TeddyHuZz (Wenfei)</h3>
                    <p className="text-xs font-mono text-[#00bfb3]">Core Architect &amp; Protocol Lead</p>
                  </div>
                  <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-white/12 shadow-md">
                    <Image
                      src="/pix-cat.png"
                      alt="TeddyHuZz avatar"
                      width={44}
                      height={44}
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Principal architect behind TidePay&apos;s Anchor smart contracts, decentralized keeper crank engine, and merchant console. Focused on Solana systems engineering, Token-2022 delegation, and non-custodial recurring payment protocols.
                </p>
                <div className="flex items-center gap-3 pt-2">
                  <a
                    href="https://github.com/TeddyHuZz"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-mono text-xs text-zinc-400 hover:text-white transition-colors"
                  >
                    <Terminal className="h-3.5 w-3.5" /> @TeddyHuZz
                  </a>
                </div>
              </div>

              {/* JV-GG Card */}
              <div className="rounded-xl border border-white/8 bg-white/2 p-5 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-white">JV-GG (Jun Voon Chen)</h3>
                    <p className="text-xs font-mono text-[#14f195]">Core Engineer &amp; API / Actions Lead</p>
                  </div>
                  <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-white/12 shadow-md">
                    <Image
                      src="/jv-gg.png"
                      alt="JV-GG avatar"
                      width={44}
                      height={44}
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Core full-stack engineer leading TidePay&apos;s developer API engine, Solana Actions &amp; Blinks integration, merchant checkout security, rate limiting, and gasless relayer infrastructure.
                </p>
                <div className="flex items-center gap-3 pt-2">
                  <a
                    href="https://github.com/JV-GG"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-mono text-xs text-zinc-400 hover:text-white transition-colors"
                  >
                    <Terminal className="h-3.5 w-3.5" /> @JV-GG
                  </a>
                </div>
              </div>
            </div>

            {/* Open Source Ecosystem banner */}
            <div className="rounded-xl border border-white/8 bg-white/2 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="h-10 w-10 shrink-0 rounded-full border border-white/10 bg-[#08090a] flex items-center justify-center text-[#14f195]">
                  <Globe2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Solana Open Source &amp; Keeper Network</h3>
                  <p className="text-xs text-zinc-400">
                    TidePay keeper crank bots are decentralized and open-source. Anyone in the community can run a node and earn bounties.
                  </p>
                </div>
              </div>
              <a
                href="https://github.com/TeddyHuZz/tidepay"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-mono text-xs text-[#14f195] hover:underline shrink-0"
              >
                GitHub Contributors <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </section>

          {/* Architectural Pillars */}
          <section className="space-y-4">
            <div className="flex items-center gap-2.5 text-white font-display text-lg sm:text-xl font-medium">
              <ShieldCheck className="h-5 w-5 text-[#5eead4]" />
              <h2>Our Core Principles</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="rounded-lg border border-white/6 bg-white/2 p-4 space-y-1.5">
                <strong className="text-white block font-medium">1. Non-Custodial Always</strong>
                <p className="text-zinc-400 leading-relaxed">
                  Never hold user deposits in pooled smart-contract vaults. Subscribers retain sovereignty of their capital until exact settlement.
                </p>
              </div>
              <div className="rounded-lg border border-white/6 bg-white/2 p-4 space-y-1.5">
                <strong className="text-white block font-medium">2. Gas-Efficient & Fast</strong>
                <p className="text-zinc-400 leading-relaxed">
                  Built on Solana for sub-second confirmation and 5,000 lamport transaction costs, making micro-subscriptions financially viable.
                </p>
              </div>
              <div className="rounded-lg border border-white/6 bg-white/2 p-4 space-y-1.5">
                <strong className="text-white block font-medium">3. Composable Everywhere</strong>
                <p className="text-zinc-400 leading-relaxed">
                  Turn any recurring subscription into an interactive Twitter / X Blink via Solana Actions or embed checkout cards anywhere on the web.
                </p>
              </div>
            </div>
          </section>

          {/* Connect Section */}
          <section className="rounded-xl border border-white/8 bg-[#0f1015] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="font-mono text-xs text-[#14f195] block mb-1">Join the Conversation</span>
              <p className="text-xs text-zinc-400">Contribute to TidePay or build recurring billing into your Solana app.</p>
            </div>
            <a
              href="https://github.com/TeddyHuZz/tidepay"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-white/12 bg-white/5 px-4 py-2 text-xs font-mono font-medium text-white hover:bg-white/10 transition-colors shrink-0"
            >
              <Terminal className="h-3.5 w-3.5" /> Star on GitHub →
            </a>
          </section>
        </div>
      </div>
    </div>
  );
}
