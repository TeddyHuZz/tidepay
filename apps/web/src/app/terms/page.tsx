import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Scale, Clock, Zap, AlertTriangle, ShieldCheck, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service | TidePay",
  description:
    "Terms of Service governing the use of the TidePay non-custodial recurring subscription engine and Solana developer tools.",
};

export default function TermsPage() {
  const effectiveDate = "October 12, 2026";

  return (
    <div className="relative min-h-screen py-16 sm:py-24">
      {/* Background ambient glow */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-125 w-200 -translate-x-1/2 rounded-full bg-linear-to-b from-[#14f195]/10 via-[#9945ff]/5 to-transparent blur-3xl" />
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
              <Scale className="h-3 w-3" /> Protocol Agreement
            </span>
            <span className="text-xs font-mono text-zinc-500">Effective: {effectiveDate}</span>
          </div>
          <h1 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-white font-display">
            Terms of Service
          </h1>
          <p className="mt-3 text-base text-zinc-400 max-w-2xl font-sans">
            These terms govern your interaction with the TidePay on-chain subscription engine, merchant console, and developer client libraries.
          </p>
        </div>

        {/* Content Body */}
        <div className="space-y-12 text-sm leading-relaxed text-zinc-300 font-sans border-t border-white/8 pt-10">
          {/* Section 1 */}
          <section className="space-y-4">
            <div className="flex items-center gap-2.5 text-white font-display text-lg sm:text-xl font-medium">
              <ShieldCheck className="h-5 w-5 text-[#14f195]" />
              <h2>1. Protocol Nature & Non-Custodial Architecture</h2>
            </div>
            <p>
              TidePay provides smart-contract primitives on the Solana blockchain facilitating non-custodial recurring payments.
              By initiating a transaction or deploying a merchant plan, you acknowledge and agree that:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div className="rounded-xl border border-white/8 bg-[#0f1015]/80 p-4 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-mono text-[#14f195]">
                  <CheckCircle2 className="h-4 w-4" /> Delegated Pull Mechanism
                </div>
                <p className="text-xs text-zinc-400">
                  Subscribers grant recurring pull allowances via SPL token delegate authority. Funds remain in subscriber self-custodial wallets until epoch settlement.
                </p>
              </div>
              <div className="rounded-xl border border-white/8 bg-[#0f1015]/80 p-4 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-mono text-[#14f195]">
                  <CheckCircle2 className="h-4 w-4" /> No Custodial Escrows
                </div>
                <p className="text-xs text-zinc-400">
                  TidePay maintains zero pooled vaults or escrow holdings. Neither TidePay nor any third party holds custody of customer capital.
                </p>
              </div>
            </div>
          </section>

          {/* Section 2 */}
          <section className="space-y-4">
            <div className="flex items-center gap-2.5 text-white font-display text-lg sm:text-xl font-medium">
              <Clock className="h-5 w-5 text-[#9945ff]" />
              <h2>2. Time-Locked Billing Cycles & Keeper Cranks</h2>
            </div>
            <p>
              Recurring settlement validity is enforced deterministically on-chain by the Solana cluster clock:
            </p>
            <div className="rounded-lg border border-white/6 bg-black/40 p-4 font-mono text-xs text-zinc-300 space-y-2">
              <p className="text-[#5eead4]">// On-Chain Invariant</p>
              <p>require!(clock.unix_timestamp &gt;= subscription.next_epoch_timestamp, TidePayError::EpochNotDue);</p>
            </div>
            <ul className="list-disc list-inside space-y-2 text-xs text-zinc-400 pt-2">
              <li>
                <strong className="text-zinc-200">Decentralized Execution:</strong> Billing epochs are triggered by open keeper crank runners who execute the <code className="font-mono text-zinc-300">process_subscription_epoch</code> instruction when an epoch is due.
              </li>
              <li>
                <strong className="text-zinc-200">Keeper Incentives:</strong> Merchants configure a fixed crank bounty (e.g., 0.05 USDC or 0.0005 SOL) deducted upon successful settlement to compensate keeper network gas expenses.
              </li>
              <li>
                <strong className="text-zinc-200">Insufficient Balance Handling:</strong> If a subscriber wallet lacks token balance or revokes delegation, the cycle fails to pull without incurring debt or overdraft penalties.
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-4">
            <div className="flex items-center gap-2.5 text-white font-display text-lg sm:text-xl font-medium">
              <Zap className="h-5 w-5 text-[#5eead4]" />
              <h2>3. Merchant Rights & Responsibilities</h2>
            </div>
            <p>
              Merchants utilizing TidePay to collect recurring revenue agree to the following obligations:
            </p>
            <div className="space-y-3 text-xs">
              <div className="rounded-lg border border-white/6 bg-white/2 p-3.5">
                <strong className="text-white block mb-1">Service Fulfillment</strong>
                Merchants are solely responsible for provisioning software licenses, SaaS access, goods, or digital memberships paid for via TidePay subscription records.
              </div>
              <div className="rounded-lg border border-white/6 bg-white/2 p-3.5">
                <strong className="text-white block mb-1">Cancellation Honor & Rent Cleanliness</strong>
                Subscribers may terminate their subscription at any time. When a subscription record is cancelled, on-chain rent lamports are returned to the subscriber account.
              </div>
              <div className="rounded-lg border border-white/6 bg-white/2 p-3.5">
                <strong className="text-white block mb-1">Protocol Fees & Mint Configuration</strong>
                Plans on Devnet operate with 0 bps protocol fee. Merchants determine accepted SPL mints (e.g. USDC, Wrapped SOL) and renewal intervals.
              </div>
            </div>
          </section>

          {/* Section 4 */}
          <section className="space-y-4">
            <div className="flex items-center gap-2.5 text-white font-display text-lg sm:text-xl font-medium">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              <h2>4. Cryptographic Risks & Disclaimers</h2>
            </div>
            <p>
              By interacting with TidePay software, you acknowledge the inherent risks of decentralized networks:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-xs text-zinc-400">
              <li>Solana network congestion, blockhash expiration, RPC rate limits, or chain re-organizations</li>
              <li>User error such as private key loss, incorrect public key derivation, or unauthorized wallet approvals</li>
              <li>Smart contract vulnerabilities or zero-day exploits across underlying token standards (SPL Token / Token-2022)</li>
            </ul>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-amber-200/90 leading-relaxed">
              TIDEPAY SOFTWARE AND SMART CONTRACTS ARE PROVIDED &quot;AS IS&quot; WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED. UNDER NO CIRCUMSTANCES SHALL THE PROTOCOL CONTRIBUTORS BE LIABLE FOR ANY FINANCIAL LOSSES OR TRANSACTIONS ARISING FROM YOUR INTERACTION WITH THE PROTOCOL.
            </div>
          </section>

          {/* Section 5 */}
          <section className="space-y-4">
            <div className="flex items-center gap-2.5 text-white font-display text-lg sm:text-xl font-medium">
              <Scale className="h-5 w-5 text-zinc-400" />
              <h2>5. Jurisdiction & Amendments</h2>
            </div>
            <p>
              TidePay was architected for global decentralized peer-to-peer commerce. You represent that your use of TidePay complies with the laws and regulations of your local jurisdiction. Protocol parameters may evolve in accordance with governance and public smart contract deployments.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
