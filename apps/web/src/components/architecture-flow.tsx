import { ArrowRight, CheckCircle2, Cpu, Key, Shield, Clock } from "lucide-react";

export function ArchitectureFlow() {
  const steps = [
    {
      number: "01",
      title: "Merchant Plan Creation",
      badge: 'PDA: [b"plan", merchant, plan_id]',
      description:
        "The merchant registers a plan on Solana. The on-chain account dictates token mint (USDC/Token-2022), billing frequency (seconds), and price per cycle.",
      highlight: "Zero Escrow Setup",
      codeSnippet: "client.createPlan({ planId: 'pro', amount: 20_000_000n, interval: 2592000n })",
    },
    {
      number: "02",
      title: "Subscriber Authorization",
      badge: 'PDA: [b"subscription", plan, subscriber]',
      description:
        "The user signs once via wallet adapter or in-feed Solana Blink. Funds remain completely in their wallet. Authority is delegated solely to TidePay's PDA.",
      highlight: "Non-Custodial Delegated Pull",
      codeSnippet: "client.subscribe({ planId: 'pro', merchant: merchantPubkey })",
    },
    {
      number: "03",
      title: "Autonomous Epoch Settlement",
      badge: "clock.unix_timestamp >= next_epoch",
      description:
        "When an epoch matures, decentralized keeper cranks call `process_subscription_epoch`. The program runs `transfer_checked` and awards a micro-crank fee.",
      highlight: "Enforced Time-Lock",
      codeSnippet: "program.methods.processSubscriptionEpoch().accounts({...}).rpc()",
    },
  ];

  return (
    <section id="architecture" className="py-20 md:py-32 border-t border-white/8 bg-[#08090a]/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center mb-16">
          <span className="font-mono text-xs uppercase tracking-widest text-[#14F195]">
            On-Chain Protocol Flow
          </span>
          <h2 className="mt-3 text-3xl sm:text-5xl font-bold tracking-tight text-white">
            How TidePay settles recurring volume
          </h2>
          <p className="mt-4 text-base text-zinc-400">
            A fully trustless lifecycle built with Anchor 0.30, Solana Token-2022, and Solana Actions.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {steps.map((step, idx) => (
            <div
              key={step.number}
              className="relative flex flex-col justify-between rounded-xl border border-white/8 bg-[#0f1015]/90 p-6 backdrop-blur-md transition hover:border-white/18"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-2xl font-bold text-white/30">
                    {step.number}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/4 px-2.5 py-0.5 font-mono text-[10px] text-zinc-400">
                    {step.highlight}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-white mb-2">{step.title}</h3>
                <div className="mb-4 inline-block rounded bg-black/60 px-2 py-1 font-mono text-[10px] text-[#14F195] border border-white/6">
                  {step.badge}
                </div>

                <p className="text-xs text-zinc-400 leading-relaxed mb-6">
                  {step.description}
                </p>
              </div>

              <div className="rounded-lg border border-white/6 bg-black/50 p-3 font-mono text-[11px] text-zinc-300 overflow-x-auto">
                <span className="text-zinc-500">// Execution snippet</span>
                <div className="text-purple-300 mt-1">{step.codeSnippet}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
