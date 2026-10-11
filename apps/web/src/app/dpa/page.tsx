import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, FileCheck, Layers, Server, Shield, Lock, FileSpreadsheet } from "lucide-react";

export const metadata: Metadata = {
  title: "Data Processing Agreement (DPA) | TidePay",
  description:
    "Data Processing Addendum for merchants, developers, and enterprises integrating TidePay non-custodial billing on Solana.",
};

export default function DpaPage() {
  const effectiveDate = "October 12, 2026";

  return (
    <div className="relative min-h-screen py-16 sm:py-24">
      {/* Background ambient glow */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-125 w-200 -translate-x-1/2 rounded-full bg-linear-to-b from-[#5eead4]/10 via-[#14f195]/5 to-transparent blur-3xl" />
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
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#5eead4]/20 bg-[#5eead4]/10 px-2.5 py-0.5 text-[11px] font-mono font-medium text-[#5eead4]">
              <FileCheck className="h-3 w-3" /> Compliance Addendum
            </span>
            <span className="text-xs font-mono text-zinc-500">Effective: {effectiveDate}</span>
          </div>
          <h1 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-white font-display">
            Data Processing Agreement (DPA)
          </h1>
          <p className="mt-3 text-base text-zinc-400 max-w-2xl font-sans">
            This Data Processing Addendum governs how blockchain transaction state, developer webhooks, and telemetry are handled for merchants using TidePay.
          </p>
        </div>

        {/* Content Body */}
        <div className="space-y-12 text-sm leading-relaxed text-zinc-300 font-sans border-t border-white/8 pt-10">
          {/* Section 1 */}
          <section className="space-y-4">
            <div className="flex items-center gap-2.5 text-white font-display text-lg sm:text-xl font-medium">
              <Layers className="h-5 w-5 text-[#5eead4]" />
              <h2>1. Scope, Roles & Definitions</h2>
            </div>
            <p>
              This DPA supplements the TidePay Terms of Service and applies to merchants integrating TidePay API routes (<code className="font-mono text-xs text-zinc-200 bg-white/5 px-1 py-0.5 rounded">api.tidepay.xyz</code>) or the TypeScript client library (<code className="font-mono text-xs text-zinc-200 bg-white/5 px-1 py-0.5 rounded">@tidepay/sdk</code>).
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="rounded-xl border border-white/8 bg-[#0f1015]/80 p-4 space-y-1">
                <span className="font-mono text-xs text-[#14f195] font-semibold">Merchant = Data Controller</span>
                <p className="text-xs text-zinc-400">
                  You determine the business purpose, pricing models, plan IDs, and contractual relationship with your subscribers.
                </p>
              </div>
              <div className="rounded-xl border border-white/8 bg-[#0f1015]/80 p-4 space-y-1">
                <span className="font-mono text-xs text-[#5eead4] font-semibold">TidePay = Data Processor</span>
                <p className="text-xs text-zinc-400">
                  TidePay processes instruction serialization, Solana Actions v0 transactions, and developer webhook notifications on your instructions.
                </p>
              </div>
            </div>
          </section>

          {/* Section 2 */}
          <section className="space-y-4">
            <div className="flex items-center gap-2.5 text-white font-display text-lg sm:text-xl font-medium">
              <FileSpreadsheet className="h-5 w-5 text-[#14f195]" />
              <h2>2. Categories of Processed Data</h2>
            </div>
            <p>
              Due to our non-custodial decentralized model, TidePay handles exclusively pseudonymous Web3 cryptographic metadata:
            </p>
            <div className="overflow-x-auto rounded-xl border border-white/8">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/8 bg-white/3 font-mono text-zinc-400">
                  <tr>
                    <th className="p-3">Data Category</th>
                    <th className="p-3">Technical Description</th>
                    <th className="p-3">Retention / Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/6 text-zinc-300">
                  <tr>
                    <td className="p-3 font-medium text-white">Wallet Public Keys</td>
                    <td className="p-3 font-mono text-zinc-400">Base58 32-byte Ed25519 addresses</td>
                    <td className="p-3">Immutable on Solana Ledger</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-white">Plan Identifiers</td>
                    <td className="p-3 font-mono text-zinc-400">Alphanumeric plan IDs (up to 32 chars)</td>
                    <td className="p-3">On-chain PDA seed + App cache</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-white">Billing Timestamps</td>
                    <td className="p-3 font-mono text-zinc-400">Unix timestamp integers (next_epoch)</td>
                    <td className="p-3">Solana on-chain state</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-white">Webhook Endpoints</td>
                    <td className="p-3 font-mono text-zinc-400">Merchant HTTPS destination URLs</td>
                    <td className="p-3">Merchant project config</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 3 */}
          <section className="space-y-4">
            <div className="flex items-center gap-2.5 text-white font-display text-lg sm:text-xl font-medium">
              <Lock className="h-5 w-5 text-[#9945ff]" />
              <h2>3. Technical & Organizational Security Measures</h2>
            </div>
            <p>
              TidePay enforces rigorous security primitives across all infrastructure boundaries:
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <li className="rounded-lg border border-white/6 bg-white/2 p-3">
                <strong className="text-white block mb-1">Non-Custodial Invariance</strong>
                Zero pooled smart-contract vaults. Billing pulls occur strictly via delegated SPL allowance.
              </li>
              <li className="rounded-lg border border-white/6 bg-white/2 p-3">
                <strong className="text-white block mb-1">State Mutation Sequencing</strong>
                Anti-reentrancy on-chain state updates occur prior to any external CPI token transfer calls.
              </li>
              <li className="rounded-lg border border-white/6 bg-white/2 p-3">
                <strong className="text-white block mb-1">Encrypted Edge Transport</strong>
                All developer API endpoints and Action Blink routes enforce TLS 1.3 with strict CORS origin verification.
              </li>
              <li className="rounded-lg border border-white/6 bg-white/2 p-3">
                <strong className="text-white block mb-1">Stateless API Execution</strong>
                API routes construct unsigned VersionedTransactions in memory without retaining subscriber identities.
              </li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-4">
            <div className="flex items-center gap-2.5 text-white font-display text-lg sm:text-xl font-medium">
              <Server className="h-5 w-5 text-[#5eead4]" />
              <h2>4. Sub-Processors & Infrastructure Providers</h2>
            </div>
            <p>
              To maintain high uptime and sub-second transaction routing, TidePay relies on reputable enterprise infrastructure:
            </p>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between rounded-lg border border-white/6 bg-white/2 p-3">
                <span className="font-medium text-white">Vercel & Cloudflare Edge</span>
                <span className="font-mono text-zinc-400">Global API routing & DDoS protection</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-white/6 bg-white/2 p-3">
                <span className="font-medium text-white">Helius / Triton Solana RPC</span>
                <span className="font-mono text-zinc-400">High-throughput blockchain cluster validation</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-white/6 bg-white/2 p-3">
                <span className="font-medium text-white">Decentralized Solana Validators</span>
                <span className="font-mono text-zinc-400">Consensus and on-chain program execution</span>
              </div>
            </div>
          </section>

          {/* Section 5 */}
          <section className="space-y-4">
            <div className="flex items-center gap-2.5 text-white font-display text-lg sm:text-xl font-medium">
              <Shield className="h-5 w-5 text-[#14f195]" />
              <h2>5. Data Subject Rights & Blockchain Realities</h2>
            </div>
            <p>
              Under international privacy frameworks (GDPR Article 17, CCPA), individuals hold the right to request deletion of personal information.
              In decentralized systems, on-chain state committed to the Solana blockchain ledger is permanent and mathematically immutable.
            </p>
            <p className="text-xs text-zinc-400">
              Merchants may delete or rotate their off-chain webhook configs and project records at any time through the TidePay Console. However, settled transaction history on the Solana cluster remains part of the public cryptographic ledger.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
