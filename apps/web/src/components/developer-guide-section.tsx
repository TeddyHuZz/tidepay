import Image from "next/image";
import { ArrowRight, ChevronDown, FileCode, Search, Terminal } from "lucide-react";

const DASHBOARD_URL = process.env.NEXT_PUBLIC_DASHBOARD_URL || "http://localhost:3000";

interface DiffLine {
  lineNum: string;
  type: "normal" | "removed" | "added";
  content: React.ReactNode;
}

const diffLines: DiffLine[] = [
  {
    lineNum: "01",
    type: "normal",
    content: (
      <>
        <span className="text-purple-400">import</span> {"{ useConnection, useWallet }"} <span className="text-purple-400">from</span> <span className="text-emerald-300">'@solana/wallet-adapter-react'</span>
      </>
    ),
  },
  {
    lineNum: "02",
    type: "removed",
    content: (
      <>
        <span className="text-rose-400">- import</span> {"{ CustodialEscrowVault }"} <span className="text-rose-400">from</span> <span className="text-rose-300">'@legacy/escrow-vault'</span>
      </>
    ),
  },
  {
    lineNum: "03",
    type: "added",
    content: (
      <>
        <span className="text-emerald-400">+ import</span> {"{ TidePayClient }"} <span className="text-emerald-400">from</span> <span className="text-emerald-300">'@tidepay/sdk'</span>
      </>
    ),
  },
  {
    lineNum: "04",
    type: "normal",
    content: <span className="text-zinc-600"> </span>,
  },
  {
    lineNum: "05",
    type: "normal",
    content: (
      <>
        <span className="text-purple-400">export const</span> <span className="text-cyan-300">useSubscribe</span> = () =&gt; {"{"}
      </>
    ),
  },
  {
    lineNum: "06",
    type: "normal",
    content: (
      <>
        {"  "}<span className="text-purple-400">const</span> {"{ connection }"} = <span className="text-cyan-300">useConnection</span>()
      </>
    ),
  },
  {
    lineNum: "07",
    type: "removed",
    content: (
      <>
        {"  "}<span className="text-rose-400">- // User must deposit upfront locked collateral</span>
      </>
    ),
  },
  {
    lineNum: "08",
    type: "removed",
    content: (
      <>
        {"  "}<span className="text-rose-400">- const</span> vault = <span className="text-rose-400">await</span> escrow.<span className="text-rose-300">lockCapital</span>({"{ amount: 150_000_000n }"})
      </>
    ),
  },
  {
    lineNum: "09",
    type: "added",
    content: (
      <>
        {"  "}<span className="text-emerald-400">+ // Non-custodial pull: funds remain in user wallet</span>
      </>
    ),
  },
  {
    lineNum: "10",
    type: "added",
    content: (
      <>
        {"  "}<span className="text-emerald-400">+ const</span> client = <span className="text-purple-400">new</span> <span className="text-cyan-300">TidePayClient</span>({"{ connection, wallet }"})
      </>
    ),
  },
  {
    lineNum: "11",
    type: "added",
    content: (
      <>
        {"  "}<span className="text-emerald-400">+ const</span> {"{ txSignature, subscriptionPda }"} = <span className="text-purple-400">await</span> client.<span className="text-cyan-300">subscribe</span>({"{"}
      </>
    ),
  },
  {
    lineNum: "12",
    type: "added",
    content: (
      <>
        {"    "}planId: <span className="text-emerald-300">"gemini-pro"</span>,
      </>
    ),
  },
  {
    lineNum: "13",
    type: "added",
    content: (
      <>
        {"    "}maxPullAmount: <span className="text-yellow-300">15_000_000n</span>, <span className="text-zinc-500">// 15 USDC</span>
      </>
    ),
  },
  {
    lineNum: "14",
    type: "added",
    content: (
      <>
        {"    "}intervalSeconds: <span className="text-yellow-300">2592000n</span>, <span className="text-zinc-500">// 30 days</span>
      </>
    ),
  },
  {
    lineNum: "15",
    type: "added",
    content: (
      <>
        {"  "}{"}"})
      </>
    ),
  },
  {
    lineNum: "16",
    type: "normal",
    content: (
      <>
        {"  "}<span className="text-purple-400">return</span> {"{ txSignature, subscriptionPda }"}
      </>
    ),
  },
  {
    lineNum: "17",
    type: "normal",
    content: <span>{"}"}</span>,
  },
];

export function DeveloperGuideSection() {
  return (
    <section id="developer-guide" className="overflow-hidden py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Header matching Linear two-column format */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-12">
          <h2 className="text-[32px] font-medium leading-[1.1] tracking-tight text-white sm:text-[40px]">
            Build, test,
            <br />
            and integrate
          </h2>
          <div>
            <p className="text-base leading-relaxed text-zinc-400 sm:text-lg">
              Streamline subscription engineering with step-by-step guides, verified Anchor
              IDL interfaces, and interactive developer sandboxes. Keep integration code
              lean without custodial escrow overhead.
            </p>
            <a
              href={`${DASHBOARD_URL}/docs`}
              target="_blank"
              rel="noopener noreferrer"
              className="group mt-6 inline-flex items-center gap-1.5 text-sm text-zinc-400 transition hover:text-white"
            >
              Read the documentation
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </a>
          </div>
        </div>

        {/* Visual Showcase: Overlapping Docs Console & Code Diff Editor */}
        <div className="relative mt-16 md:mt-20 min-h-0 lg:min-h-140">
          {/* Left / Base Window: Documentation Portal Screenshot */}
          <div className="w-full lg:w-[68%] relative">
            <div className="overflow-hidden rounded-xl border border-white/8 bg-[#0a0c10] shadow-[0_25px_70px_-15px_rgba(0,0,0,0.85)]">
              {/* Browser/Window Header */}
              <div className="flex items-center justify-between border-b border-white/6 bg-white/2 px-4 py-3 text-xs text-zinc-400">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
                  <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
                  <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
                  <span className="ml-2 font-mono text-[11px] text-zinc-500">
                    docs.tidepay.xyz/start-your-journey
                  </span>
                </div>
                <div className="hidden sm:flex items-center gap-1.5 rounded-md border border-white/6 bg-white/3 px-2 py-1 text-[11px] text-zinc-400">
                  <Search className="h-3 w-3 text-zinc-500" />
                  <span>Search SDK methods...</span>
                  <kbd className="rounded border border-white/10 bg-white/5 px-1 text-[9px] text-zinc-500">
                    /
                  </kbd>
                </div>
              </div>

              {/* Screenshot with Edge Dissipation Gradients */}
              <div className="relative">
                <Image
                  src="/developer-guide.png"
                  alt="TidePay Developer Documentation Guide"
                  width={3418}
                  height={1892}
                  sizes="(min-width: 1024px) 68vw, 100vw"
                  className="h-auto w-full object-cover"
                />
                {/* Gradients dissolving image towards the overlapping diff editor */}
                <div className="pointer-events-none absolute inset-0 bg-linear-to-r from-transparent via-transparent to-[#08090a]/80 lg:block hidden" />
                <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-transparent via-[#08090a]/10 to-[#08090a]/70" />
              </div>
            </div>
          </div>

          {/* Right / Overlapping Code Diff Editor Window (Mirroring Linear Code Review Diff) */}
          <div className="mt-6 lg:mt-0 lg:absolute lg:top-8 lg:right-0 lg:w-[54%] z-20">
            <div className="rounded-xl border border-white/10 bg-[#0d0e14]/98 shadow-[0_35px_90px_-15px_rgba(0,0,0,0.95)] backdrop-blur-xl overflow-hidden">
              {/* File Tab & Window Bar */}
              <div className="flex items-center justify-between border-b border-white/6 bg-white/2 px-4 py-3">
                <div className="flex items-center gap-2 text-xs">
                  <FileCode className="h-3.5 w-3.5 text-cyan-400" />
                  <span className="font-mono text-zinc-300">
                    apps/web/src/hooks/use-subscribe.ts
                  </span>
                </div>
                <div className="flex items-center gap-2 text-zinc-500 font-mono text-[11px]">
                  <span className="flex items-center gap-1 text-zinc-400">
                    TypeScript <ChevronDown className="h-3 w-3 text-zinc-500" />
                  </span>
                </div>
              </div>

                {/* Code Diff Body */}
                <div className="p-4 font-mono text-[11px] leading-[1.65] overflow-x-auto">
                  {diffLines.map((line, idx) => (
                    <div
                      key={idx}
                      className={`flex items-start rounded-xs px-2 py-0.5 transition-colors ${
                        line.type === "removed"
                          ? "bg-rose-500/10 text-rose-200 border-l-2 border-rose-500"
                          : line.type === "added"
                          ? "bg-emerald-500/10 text-emerald-100 border-l-2 border-[#14F195]"
                          : "text-zinc-300 hover:bg-white/2"
                      }`}
                    >
                      <span
                        className={`mr-3 w-5 shrink-0 select-none text-right text-[10px] ${
                          line.type === "removed"
                            ? "text-rose-400"
                            : line.type === "added"
                            ? "text-emerald-400"
                            : "text-zinc-600"
                        }`}
                      >
                        {line.lineNum}
                      </span>
                      <div className="overflow-x-auto whitespace-pre">
                        {line.content}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bottom Bar matching Linear status line */}
                <div className="flex items-center justify-between border-t border-white/6 bg-white/2 px-4 py-2.5 font-mono text-[10px] text-zinc-500">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#14F195]" />
                      Non-Custodial Architecture
                    </span>
                    <span className="text-zinc-600">|</span>
                    <span className="text-zinc-400">Anchor 0.30 IDL</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
