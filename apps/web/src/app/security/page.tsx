import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  ShieldAlert,
  ShieldCheck,
  Lock,
  Cpu,
  Key,
  Terminal,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Security Architecture & Trust | TidePay",
  description:
    "Security specifications, non-custodial invariants, and formal on-chain audit guidelines for the TidePay protocol on Solana.",
};

export default function SecurityPage() {
  const lastAudited = "Colosseum Hackathon 2026";

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
              <ShieldCheck className="h-3 w-3" /> Security Architecture
            </span>
            <span className="text-xs font-mono text-zinc-500">Benchmark: {lastAudited}</span>
          </div>
          <h1 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-white font-display">
            Security & Cryptographic Invariants
          </h1>
          <p className="mt-3 text-base text-zinc-400 max-w-2xl font-sans">
            TidePay was designed with zero custodial surface area. By replacing pooled escrow vaults with delegated pull authority, the protocol eliminates honeypot systemic risk.
          </p>
        </div>

        {/* Content Body */}
        <div className="space-y-12 text-sm leading-relaxed text-zinc-300 font-sans border-t border-white/8 pt-10">
          {/* Section 1 */}
          <section className="space-y-4">
            <div className="flex items-center gap-2.5 text-white font-display text-lg sm:text-xl font-medium">
              <Lock className="h-5 w-5 text-[#14f195]" />
              <h2>1. Non-Custodial Core Invariance</h2>
            </div>
            <p>
              Traditional recurring billing systems in Web3 attempt to lock user capital in multi-signature escrow vaults or pooled liquidity pools. This creates attractive targets for exploits.
            </p>
            <div className="rounded-xl border border-white/8 bg-[#0f1015]/80 p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-mono text-[#14f195]">
                <CheckCircle2 className="h-4 w-4" /> Delegated Pull Authority Design
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Subscribers retain 100% custody of their tokens. When subscribing, the user executes an SPL token <code className="font-mono text-zinc-200">ApproveChecked</code> instruction, granting spending allowance to TidePay&apos;s Program Derived Authority (<code className="font-mono text-zinc-200">tidepay_auth</code> PDA). Funds only move when an epoch is due.
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section className="space-y-4">
            <div className="flex items-center gap-2.5 text-white font-display text-lg sm:text-xl font-medium">
              <Clock className="h-5 w-5 text-[#9945ff]" />
              <h2>2. Anti-Reentrancy & Temporal Enforcement</h2>
            </div>
            <p>
              To guard against re-entrancy and double-spend attacks during epoch processing, TidePay enforces two strict on-chain guarantees:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div className="rounded-xl border border-white/8 bg-white/2 p-4 space-y-2">
                <span className="font-mono text-xs text-[#5eead4] block">1. State Before CPI Mutation</span>
                <p className="text-xs text-zinc-400">
                  <code className="font-mono text-zinc-300">subscription.last_epoch_timestamp</code> and <code className="font-mono text-zinc-300">cycle_count</code> are incremented on-chain <em>before</em> calling external CPI token transfers, preventing recursive re-entrancy.
                </p>
              </div>
              <div className="rounded-xl border border-white/8 bg-white/2 p-4 space-y-2">
                <span className="font-mono text-xs text-[#5eead4] block">2. Cluster Clock Authority</span>
                <p className="text-xs text-zinc-400">
                  Settlements reject client-side timestamps. Validity relies strictly on the Solana cluster validator clock: <code className="font-mono text-zinc-300">Clock::get()?.unix_timestamp &gt;= next_epoch</code>.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section className="space-y-4">
            <div className="flex items-center gap-2.5 text-white font-display text-lg sm:text-xl font-medium">
              <Key className="h-5 w-5 text-[#5eead4]" />
              <h2>3. Deterministic PDA Seed Derivations</h2>
            </div>
            <p>
              All state accounts are isolated with cryptographic PDA derivations and Anchor 8-byte discriminators:
            </p>
            <div className="rounded-xl border border-white/8 bg-black/50 p-4 font-mono text-xs space-y-2.5 text-zinc-300">
              <div className="flex items-start justify-between gap-4 border-b border-white/6 pb-2">
                <span className="text-[#14f195]">MerchantPlan</span>
                <span className="text-zinc-400">[b&quot;plan&quot;, merchant_pubkey, plan_id]</span>
              </div>
              <div className="flex items-start justify-between gap-4 border-b border-white/6 pb-2">
                <span className="text-[#14f195]">SubscriptionRecord</span>
                <span className="text-zinc-400">[b&quot;subscription&quot;, plan_pubkey, subscriber_pubkey]</span>
              </div>
              <div className="flex items-start justify-between gap-4">
                <span className="text-[#14f195]">ProgramAuthority</span>
                <span className="text-zinc-400">[b&quot;tidepay_auth&quot;]</span>
              </div>
            </div>
          </section>

          {/* Section 4 */}
          <section className="space-y-4">
            <div className="flex items-center gap-2.5 text-white font-display text-lg sm:text-xl font-medium">
              <Cpu className="h-5 w-5 text-[#14f195]" />
              <h2>4. SPL Token &amp; Token-2022 Safety</h2>
            </div>
            <ul className="space-y-3 text-xs">
              <li className="rounded-lg border border-white/6 bg-white/2 p-3.5 flex items-start gap-3">
                <CheckCircle2 className="h-4 w-4 text-[#14f195] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block mb-0.5">Exact Decimals Enforcement</strong>
                  All token movements use <code className="font-mono text-zinc-300">transfer_checked</code> instead of raw <code className="font-mono text-zinc-300">transfer</code>, strictly validating mint decimals and avoiding rounding miscalculations.
                </div>
              </li>
              <li className="rounded-lg border border-white/6 bg-white/2 p-3.5 flex items-start gap-3">
                <CheckCircle2 className="h-4 w-4 text-[#14f195] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block mb-0.5">Rent Cleanliness &amp; Lamport Reclamation</strong>
                  Subscription cancellations explicitly close the account and return rent lamports directly to the subscriber wallet via <code className="font-mono text-zinc-300">close = subscriber</code>.
                </div>
              </li>
              <li className="rounded-lg border border-white/6 bg-white/2 p-3.5 flex items-start gap-3">
                <CheckCircle2 className="h-4 w-4 text-[#14f195] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block mb-0.5">Keeper Crank Idempotency</strong>
                  Crank relayer microservices maintain in-memory concurrency locks to prevent in-flight duplicate transaction submissions.
                </div>
              </li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-4">
            <div className="flex items-center gap-2.5 text-white font-display text-lg sm:text-xl font-medium">
              <ShieldAlert className="h-5 w-5 text-amber-400" />
              <h2>5. Responsible Vulnerability Disclosure</h2>
            </div>
            <p>
              TidePay welcomes responsible disclosures from security researchers, white-hat engineers, and auditors.
              If you identify an issue in our on-chain program, keeper crank, or developer SDK, please report it directly:
            </p>
            <div className="rounded-xl border border-white/8 bg-[#0f1015] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="font-mono text-xs text-[#14f195] block mb-1">Security Contact</span>
                <span className="text-xs text-zinc-400 font-mono">security@tidepay.xyz</span>
              </div>
              <a
                href="https://github.com/TeddyHuZz/tidepay/security"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/12 bg-white/5 px-4 py-2 text-xs font-mono font-medium text-white hover:bg-white/10 transition-colors"
              >
                <Terminal className="h-3.5 w-3.5" /> GitHub Security Advisories →
              </a>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
