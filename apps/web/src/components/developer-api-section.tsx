import Image from "next/image";
import { ArrowRight, Check, Code2, Key, Radio, ShieldCheck, Terminal, Webhook } from "lucide-react";

const DASHBOARD_URL = process.env.NEXT_PUBLIC_DASHBOARD_URL || "http://localhost:3000";

export function DeveloperApiSection() {
  return (
    <section id="developer-apis" className="overflow-hidden py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-12">
          <h2 className="text-[32px] font-medium leading-[1.1] tracking-tight text-white sm:text-[40px]">
            Webhooks
            <br />
            and developer APIs
          </h2>
          <div>
            <p className="text-base leading-relaxed text-zinc-400 sm:text-lg">
              Integrate automated non-custodial recurring billing into your stack in minutes.
              Listen for on-chain crank settlements via HMAC-SHA256 signed webhooks,
              and query subscription states using type-safe TypeScript SDKs.
            </p>
            <a
              href={`${DASHBOARD_URL}/webhooks-api`}
              target="_blank"
              rel="noopener noreferrer"
              className="group mt-6 inline-flex items-center gap-1.5 text-sm text-zinc-400 transition hover:text-white"
            >
              Developer guide & API keys
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </a>
          </div>
        </div>

        {/* Visual Showcase: Faded background dashboard + 3 modular developer cards */}
        <div className="relative mt-16 md:mt-20">
          {/* Faded webhook-api.png screenshot in background */}
          <div className="relative mx-auto w-full opacity-40">
            <Image
              src="/webhook-api.png"
              alt="TidePay Webhooks and API Keys dashboard console"
              width={3418}
              height={1894}
              sizes="(min-width: 1152px) 1152px, 100vw"
              className="h-auto w-full rounded-xl border border-white/8"
            />
            {/* Multi-directional gradient overlays fading into obsidian canvas */}
            <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-transparent via-[#08090a]/50 to-[#08090a]" />
            <div className="pointer-events-none absolute inset-0 bg-linear-to-r from-[#08090a]/60 via-transparent to-[#08090a]/60" />
            <div className="pointer-events-none absolute inset-0 bg-radial from-transparent via-[#08090a]/40 to-[#08090a]" />
          </div>

          {/* Floating Linear-style Window Cards (mirroring Linear's Cursor / Linear Opus / ChatPRD) */}
          <div className="relative z-10 -mt-36 sm:-mt-52 md:-mt-72 lg:-mt-96 grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Card 1: Webhook Event Listener */}
            <div className="rounded-xl border border-white/10 bg-[#0f1015]/95 p-5 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.95)] backdrop-blur-md flex flex-col justify-between">
              <div>
                {/* Window Chrome with Linear-style controls */}
                <div className="flex items-center justify-between pb-3.5 border-b border-white/6 text-xs text-zinc-400">
                  <div className="flex items-center gap-2">
                    <Webhook className="h-3.5 w-3.5 text-[#14F195]" />
                    <span className="font-medium text-white">Event Dispatcher</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-500 font-mono text-[11px]">
                    <span className="cursor-default hover:text-zinc-300">_</span>
                    <span className="cursor-default hover:text-zinc-300">⤢</span>
                    <span className="cursor-default hover:text-zinc-300">✕</span>
                  </div>
                </div>

                {/* Linear-style input prompt card */}
                <div className="mt-4 rounded-md border border-white/6 bg-white/3 p-2.5 text-xs text-zinc-300">
                  <span className="text-zinc-500 font-mono text-[10px] block mb-1">
                    tidepay-event-stream
                  </span>
                  Listen for recurring pull settlements and broadcast real-time events.
                </div>

                {/* Status indicator */}
                <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#14F195] animate-ping" />
                    <span className="text-zinc-300 font-mono">Settled in 42ms</span>
                  </div>
                  <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[10px] text-[#14F195] border border-emerald-500/20">
                    200 OK
                  </span>
                </div>

                {/* Event Payload Terminal */}
                <div className="mt-3 rounded-lg border border-white/6 bg-black/50 p-3 font-mono text-[11px] leading-relaxed text-zinc-300">
                  <div className="text-zinc-500">// subscription.epoch_settled</div>
                  <div className="mt-1 text-purple-300">
                    event: <span className="text-emerald-400">"epoch_settled"</span>
                  </div>
                  <div className="text-zinc-400">
                    subscriber: <span className="text-zinc-300">"8xKv...9mQz"</span>
                  </div>
                  <div className="text-zinc-400">
                    amount: <span className="text-yellow-300">"15.00 USDC"</span>
                  </div>
                  <div className="text-zinc-400">
                    crankReward: <span className="text-yellow-300">"0.05 USDC"</span>
                  </div>
                  <div className="text-zinc-400">
                    cycleCount: <span className="text-amber-300">14</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/6 flex items-center justify-between font-mono text-[10px] text-zinc-500">
                <span>POST /api/webhooks/tidepay</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <Check className="h-3 w-3" /> HMAC-SHA256
                </span>
              </div>
            </div>

            {/* Card 2: Signature Verification Guard */}
            <div className="rounded-xl border border-white/10 bg-[#0f1015]/95 p-5 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.95)] backdrop-blur-md flex flex-col justify-between">
              <div>
                {/* Window Chrome with Linear-style controls */}
                <div className="flex items-center justify-between pb-3.5 border-b border-white/6 text-xs text-zinc-400">
                  <div className="flex items-center gap-2">
                    <Key className="h-3.5 w-3.5 text-[#9945FF]" />
                    <span className="font-medium text-white">Signature Guard</span>
                    <span className="rounded bg-white/6 px-1.5 py-0.2 font-mono text-[10px] text-zinc-400">v1</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-500 font-mono text-[11px]">
                    <span className="cursor-default hover:text-zinc-300">_</span>
                    <span className="cursor-default hover:text-zinc-300">⤢</span>
                    <span className="cursor-default hover:text-zinc-300">✕</span>
                  </div>
                </div>

                {/* Prompt block matching Linear's Cursor style */}
                <div className="mt-4 rounded-md border border-white/6 bg-white/3 p-2.5 text-xs text-zinc-300">
                  <span className="text-zinc-500 font-mono text-[10px] block mb-1">
                    app/api/webhooks/route.ts
                  </span>
                  Verify header signature using TidePay secret key before granting entitlement.
                </div>

                {/* Status indicator */}
                <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-400">
                  <span className="text-zinc-400 font-mono">Constant-time validation</span>
                  <span className="text-purple-400 font-mono text-[10px]">crypto.timingSafeEqual</span>
                </div>

                {/* Code verification preview */}
                <div className="mt-3 rounded-lg border border-white/6 bg-black/50 p-3 font-mono text-[11px] leading-relaxed text-zinc-300">
                  <div className="text-purple-400">
                    const <span className="text-white">verified</span> = tidepay.webhooks.
                  </div>
                  <div className="pl-2 text-cyan-300">verifySignature({`{`}</div>
                  <div className="pl-4 text-zinc-400">payload: rawBody,</div>
                  <div className="pl-4 text-zinc-400">signature: headers[<span className="text-emerald-300">"x-signature"</span>],</div>
                  <div className="pl-4 text-zinc-400">secret: process.env.WH_SECRET</div>
                  <div className="pl-2 text-cyan-300">{`}`});</div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/6 flex items-center justify-between font-mono text-[10px] text-zinc-500">
                <span className="text-zinc-400">whsec_10••••••••••</span>
                <span className="text-purple-400 font-semibold">Replay Guard (300s)</span>
              </div>
            </div>

            {/* Card 3: Type-Safe SDK Client */}
            <div className="rounded-xl border border-white/10 bg-[#0f1015]/95 p-5 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.95)] backdrop-blur-md flex flex-col justify-between">
              <div>
                {/* Window Chrome with Linear-style controls */}
                <div className="flex items-center justify-between pb-3.5 border-b border-white/6 text-xs text-zinc-400">
                  <div className="flex items-center gap-2">
                    <Terminal className="h-3.5 w-3.5 text-cyan-400" />
                    <span className="font-medium text-white">@tidepay/sdk</span>
                    <span className="font-mono text-[10px] text-cyan-400">TS 5+</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-500 font-mono text-[11px]">
                    <span className="cursor-default hover:text-zinc-300">_</span>
                    <span className="cursor-default hover:text-zinc-300">⤢</span>
                    <span className="cursor-default hover:text-zinc-300">✕</span>
                  </div>
                </div>

                {/* Prompt block */}
                <div className="mt-4 rounded-md border border-white/6 bg-white/3 p-2.5 text-xs text-zinc-300">
                  <span className="text-zinc-500 font-mono text-[10px] block mb-1">
                    client-initialization.ts
                  </span>
                  Initialize TidePayClient with AnchorProvider or standard Solana connection.
                </div>

                <div className="mt-3 space-y-2">
                  <div className="flex items-start gap-2.5 rounded-lg border border-white/6 bg-black/40 p-2 text-xs">
                    <ShieldCheck className="h-3.5 w-3.5 text-[#14F195] shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium text-white text-[11px]">Anchor 0.30 IDL Types</div>
                      <div className="text-[10px] text-zinc-400">
                        Strict account coder for plan and subscription records.
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 rounded-lg border border-white/6 bg-black/40 p-2 text-xs">
                    <Radio className="h-3.5 w-3.5 text-[#9945FF] shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium text-white text-[11px]">Crank Relayer Helpers</div>
                      <div className="text-[10px] text-zinc-400">
                        Memcmp filter helpers to find due subscribers.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-3 rounded border border-white/6 bg-black/50 p-2 font-mono text-[11px] text-zinc-300">
                  <span className="text-zinc-500">$</span> pnpm add @tidepay/sdk @tidepay/types
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/6 flex items-center justify-between font-mono text-[10px] text-zinc-500">
                <span>Native BigInt Hygiene</span>
                <span className="text-cyan-400">Zero Any Types</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
