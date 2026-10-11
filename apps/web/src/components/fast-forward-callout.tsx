"use client";

import { useState } from "react";
import { ArrowRight, Clock, FastForward, PlayCircle, ShieldCheck, Zap } from "lucide-react";

const DASHBOARD_URL = process.env.NEXT_PUBLIC_DASHBOARD_URL || "http://localhost:3000";

export function FastForwardCallout() {
  const [fastForwardActive, setFastForwardActive] = useState(true);

  return (
    <section id="fast-forward" className="py-20 md:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-2xl border border-emerald-500/30 bg-linear-to-b from-emerald-950/20 via-[#0f1015] to-[#0c0d12] p-8 sm:p-12 md:p-16 backdrop-blur-xl overflow-hidden shadow-2xl">
          {/* Subtle top indicator */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-8 border-b border-white/8">
            <div className="flex items-center gap-2.5">
              <span className="flex h-3 w-3 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono text-xs uppercase tracking-wider text-emerald-400 font-semibold">
                Colosseum Hackathon Judge Mode
              </span>
            </div>
            <span className="rounded-full border border-white/10 bg-white/4 px-3 py-1 font-mono text-xs text-zinc-400">
              Devnet Cluster Enabled
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-8">
            <div className="lg:col-span-7">
              <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
                Evaluate recurring pulls in <span className="text-emerald-400">60 seconds</span>, not 30 days.
              </h2>
              <p className="mt-4 text-base text-zinc-300 leading-relaxed">
                Standard recurring contracts require weeks to observe renewal settlement. To facilitate frictionless hackathon evaluation, TidePay features an on-chain fast-forward testing mode with Devnet billing intervals down to 60 seconds.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <a
                  href={`${DASHBOARD_URL}/demo`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-400 px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-emerald-300 shadow-lg shadow-emerald-500/20"
                >
                  <PlayCircle className="h-4 w-4" />
                  Test Live Demo SaaS
                </a>
                <a
                  href={`${DASHBOARD_URL}/plans/new`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/4 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/8"
                >
                  Create Fast-Forward Plan
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </div>

            {/* Interactive Toggle Card */}
            <div className="lg:col-span-5">
              <div className="rounded-xl border border-white/10 bg-[#090a0d] p-6 shadow-inner">
                <div className="flex items-center justify-between pb-4 border-b border-white/6">
                  <span className="text-xs font-mono text-zinc-400">Interval Mode Preview</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setFastForwardActive(false)}
                      className={`px-2 py-1 text-[11px] font-mono rounded transition ${
                        !fastForwardActive
                          ? "bg-white/10 text-white"
                          : "text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      Production
                    </button>
                    <button
                      type="button"
                      onClick={() => setFastForwardActive(true)}
                      className={`px-2 py-1 text-[11px] font-mono rounded transition ${
                        fastForwardActive
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      Judge Devnet
                    </button>
                  </div>
                </div>

                <div className="py-6 flex flex-col items-center justify-center text-center">
                  <div className="text-4xl font-bold font-mono tracking-tight text-white mb-2">
                    {fastForwardActive ? "60 Seconds" : "30 Days"}
                  </div>
                  <span className="text-xs text-zinc-500 font-mono">
                    {fastForwardActive
                      ? "billing_interval_seconds = 60"
                      : "billing_interval_seconds = 2,592,000"}
                  </span>
                </div>

                <div className="rounded border border-white/6 bg-black/40 p-3 text-[11px] font-mono text-zinc-400 space-y-1.5">
                  <div className="flex justify-between">
                    <span>On-Chain Epoch Trigger:</span>
                    <span className="text-emerald-400">Automated Keeper Crank</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Clock Validation:</span>
                    <span className="text-white">Strict Unix Timestamp</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Target Network:</span>
                    <span className="text-purple-400">Solana Devnet</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
