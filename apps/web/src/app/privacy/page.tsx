import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Shield, Lock, Eye, FileText, Database, RefreshCw } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy | TidePay",
  description:
    "TidePay privacy policy. Non-custodial, open architecture for Solana recurring billing with zero tracking of personal identities.",
};

export default function PrivacyPage() {
  const lastUpdated = "October 12, 2026";

  return (
    <div className="relative min-h-screen py-16 sm:py-24">
      {/* Background ambient glow */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-125 w-200 -translate-x-1/2 rounded-full bg-linear-to-b from-[#9945ff]/10 via-[#14f195]/5 to-transparent blur-3xl" />
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
              <Shield className="h-3 w-3" /> Legal & Governance
            </span>
            <span className="text-xs font-mono text-zinc-500">Last updated: {lastUpdated}</span>
          </div>
          <h1 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-white font-display">
            Privacy Policy
          </h1>
          <p className="mt-3 text-base text-zinc-400 max-w-2xl font-sans">
            TidePay is a non-custodial recurring payment protocol on Solana. We do not maintain user databases, custodial wallets, or store private encryption keys.
          </p>
        </div>

        {/* Content Body */}
        <div className="space-y-12 text-sm leading-relaxed text-zinc-300 font-sans border-t border-white/8 pt-10">
          {/* Section 1 */}
          <section className="space-y-4">
            <div className="flex items-center gap-2.5 text-white font-display text-lg sm:text-xl font-medium">
              <Eye className="h-5 w-5 text-[#14f195]" />
              <h2>1. Fundamental Non-Custodial Architecture</h2>
            </div>
            <p>
              TidePay operates as a suite of immutable and verifiable smart contracts deployed on the Solana blockchain.
              Unlike traditional subscription gateways (e.g., Stripe, Chargebee), TidePay never takes custody of subscriber funds or requires account registration with email, password, or credit card details.
            </p>
            <div className="rounded-xl border border-white/8 bg-[#0f1015]/80 p-5 space-y-2">
              <h3 className="font-mono text-xs text-[#14f195] uppercase tracking-wider">What We Never Collect</h3>
              <ul className="list-disc list-inside space-y-1.5 text-xs text-zinc-400">
                <li>Private keys, seed phrases, or wallet authentication tokens</li>
                <li>Credit card numbers, bank account details, or traditional billing addresses</li>
                <li>Personal Identifiable Information (PII) such as full names, physical addresses, or phone numbers</li>
                <li>Biometric or identity verification (KYC) documentation</li>
              </ul>
            </div>
          </section>

          {/* Section 2 */}
          <section className="space-y-4">
            <div className="flex items-center gap-2.5 text-white font-display text-lg sm:text-xl font-medium">
              <Database className="h-5 w-5 text-[#9945ff]" />
              <h2>2. On-Chain Public Ledger Data</h2>
            </div>
            <p>
              When you interact with the TidePay Anchor protocol—such as creating a <code className="font-mono text-xs text-zinc-200 bg-white/5 px-1.5 py-0.5 rounded">MerchantPlan</code>, approving an SPL token allowance, or subscribing to a billing cycle—the following parameters are indelibly recorded on the public Solana ledger:
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <li className="rounded-lg border border-white/6 bg-white/2 p-3 text-xs">
                <span className="font-mono text-[#5eead4] block mb-1">Public Wallet Addresses</span>
                The Ed25519 public key of the merchant, subscriber, and crank relayer.
              </li>
              <li className="rounded-lg border border-white/6 bg-white/2 p-3 text-xs">
                <span className="font-mono text-[#5eead4] block mb-1">Transaction Signatures</span>
                Cryptographic transaction receipts on the Solana cluster.
              </li>
              <li className="rounded-lg border border-white/6 bg-white/2 p-3 text-xs">
                <span className="font-mono text-[#5eead4] block mb-1">Program Derived Accounts</span>
                Public keys derived deterministically from merchant seeds and plan IDs.
              </li>
              <li className="rounded-lg border border-white/6 bg-white/2 p-3 text-xs">
                <span className="font-mono text-[#5eead4] block mb-1">Billing Epoch Timestamps</span>
                Solana cluster unix timestamps dictating epoch eligibility.
              </li>
            </ul>
            <p className="text-xs text-zinc-400">
              Please note that on-chain data is public by nature of the Solana blockchain and cannot be altered, redacted, or expunged by TidePay or any third party.
            </p>
          </section>

          {/* Section 3 */}
          <section className="space-y-4">
            <div className="flex items-center gap-2.5 text-white font-display text-lg sm:text-xl font-medium">
              <Lock className="h-5 w-5 text-[#5eead4]" />
              <h2>3. Off-Chain Telemetry & API Usage</h2>
            </div>
            <p>
              For users accessing the TidePay Console (<code className="font-mono text-xs text-zinc-200 bg-white/5 px-1.5 py-0.5 rounded">app.tidepay.xyz</code>) or the Developer API (<code className="font-mono text-xs text-zinc-200 bg-white/5 px-1.5 py-0.5 rounded">api.tidepay.xyz</code>), we maintain privacy-first engineering standards:
            </p>
            <div className="space-y-3 text-xs">
              <div className="flex gap-3">
                <div className="h-2 w-2 rounded-full bg-[#14f195] mt-1.5 shrink-0" />
                <p>
                  <strong className="text-white">RPC Node Communications:</strong> Requests made to Solana RPC providers (such as Helius, Triton, or Solana Foundation RPCs) route through encrypted HTTPS/WSS endpoints to fetch on-chain account states.
                </p>
              </div>
              <div className="flex gap-3">
                <div className="h-2 w-2 rounded-full bg-[#14f195] mt-1.5 shrink-0" />
                <p>
                  <strong className="text-white">Local Device Storage:</strong> We use your browser&apos;s local storage strictly for UI state persistence (e.g., active merchant project preferences, dark mode styling, and tutorial checklist completion). No tracking cookies are sold to advertising networks.
                </p>
              </div>
              <div className="flex gap-3">
                <div className="h-2 w-2 rounded-full bg-[#14f195] mt-1.5 shrink-0" />
                <p>
                  <strong className="text-white">Webhook Deliveries:</strong> Merchants configuring automated webhooks receive real-time cryptographic payload deliveries containing subscription events. Webhook payloads do not contain sensitive user identities.
                </p>
              </div>
            </div>
          </section>

          {/* Section 4 */}
          <section className="space-y-4">
            <div className="flex items-center gap-2.5 text-white font-display text-lg sm:text-xl font-medium">
              <RefreshCw className="h-5 w-5 text-[#14f195]" />
              <h2>4. Subscriber Self-Sovereign Rights</h2>
            </div>
            <p>
              Under TidePay&apos;s delegated pull design, you retain complete sovereignty over your capital at all times:
            </p>
            <ul className="list-disc list-inside space-y-2 text-xs text-zinc-400">
              <li>
                <strong className="text-zinc-200">Instant Revocation:</strong> You can revoke your SPL token delegation at any second directly through your Solana wallet or via our open-source client SDK without requesting permission from the merchant.
              </li>
              <li>
                <strong className="text-zinc-200">Rent Lamport Recovery:</strong> When you cancel a subscription, the on-chain account closure instruction explicitly returns all rent-exempt lamports back to your wallet address.
              </li>
              <li>
                <strong className="text-zinc-200">Zero Lock-In:</strong> No custodial intermediary can freeze or seize your funds.
              </li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-4">
            <div className="flex items-center gap-2.5 text-white font-display text-lg sm:text-xl font-medium">
              <FileText className="h-5 w-5 text-zinc-400" />
              <h2>5. Inquiries & Protocol Governance</h2>
            </div>
            <p>
              As an open-source decentralized protocol built for the Solana ecosystem, TidePay protocol specifications and IDL definitions are publicly audit-ready on GitHub.
            </p>
            <div className="rounded-lg border border-white/6 bg-white/2 p-4 text-xs flex flex-wrap items-center justify-between gap-4">
              <span className="text-zinc-400">Questions regarding data practices or protocol security?</span>
              <a
                href="https://github.com/TeddyHuZz/tidepay"
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-[#14f195] hover:underline"
              >
                github.com/TeddyHuZz/tidepay →
              </a>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
