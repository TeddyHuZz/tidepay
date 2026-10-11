import Image from "next/image";
import { ArrowRight, BadgeCheck, Heart, MessageCircle, Repeat2, Zap } from "lucide-react";

const DASHBOARD_URL = process.env.NEXT_PUBLIC_DASHBOARD_URL || "http://localhost:3000";

function BlinkPostCard() {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0f1015]/95 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)] backdrop-blur-md">
      {/* Post header */}
      <div className="flex items-center justify-between border-b border-white/6 px-4 py-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-semibold text-white">𝕏</span>
          <span className="text-zinc-300">Post</span>
        </div>
        <span className="font-mono text-[11px] text-zinc-600">dial.to</span>
      </div>

      <div className="px-4 py-4">
        {/* Author */}
        <div className="flex gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#00bfb3]/15 text-sm font-semibold text-[#00bfb3]">
            T
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1 text-sm">
              <span className="font-medium text-white">TidePay</span>
              <BadgeCheck className="h-3.5 w-3.5 text-[#00bfb3]" />
              <span className="truncate text-zinc-500">@tidepay · 2m</span>
            </div>
            <p className="mt-1 text-sm leading-relaxed text-zinc-300">
              gemini-pro is live. Subscribe straight from your feed — funds stay in your wallet.
            </p>
          </div>
        </div>

        {/* Blink unfurl */}
        <div className="mt-4 overflow-hidden rounded-lg border border-white/8 bg-[#0a0b0e]">
          <div className="flex h-20 items-end bg-[radial-gradient(ellipse_80%_120%_at_20%_0%,rgba(0,191,179,0.25),transparent_70%)] px-3 pb-2">
            <span className="font-mono text-[10px] text-zinc-500">api.tidepay.xyz/actions/subscribe</span>
          </div>
          <div className="space-y-3 p-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-mono text-sm font-medium text-white">gemini-pro</span>
              <span className="text-xs text-zinc-400">
                <span className="text-white">0.10 USDC</span> / minute
              </span>
            </div>
            <p className="text-xs leading-relaxed text-zinc-500">
              Recurring pull via delegated authority. Cancel anytime and reclaim rent.
            </p>
            <button
              type="button"
              className="flex w-full items-center justify-center gap-1.5 rounded-md bg-[#00bfb3] py-2 text-xs font-semibold text-[#022425] transition hover:bg-[#19d1c5]"
            >
              <Zap className="h-3.5 w-3.5" />
              Subscribe · 0.10 USDC
            </button>
          </div>
        </div>

        {/* Engagement row */}
        <div className="mt-3 flex items-center gap-6 text-zinc-600">
          <MessageCircle className="h-3.5 w-3.5" />
          <Repeat2 className="h-3.5 w-3.5" />
          <Heart className="h-3.5 w-3.5" />
        </div>
      </div>
    </div>
  );
}

export function DistributionSection() {
  return (
    <section id="plans" className="overflow-hidden py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-12">
          <h2 className="text-[32px] font-medium leading-[1.1] tracking-tight text-white sm:text-[40px]">
            Plans
            <br />
            and distribution
          </h2>
          <div>
            <p className="text-base leading-relaxed text-zinc-400 sm:text-lg">
              Launch a plan in one transaction, then share it anywhere as a Solana Blink or checkout link.
              Every renewal settles on-chain and lands in your dashboard.
            </p>
            <a
              href={`${DASHBOARD_URL}/plans/new`}
              className="group mt-6 inline-flex items-center gap-1.5 text-sm text-zinc-400 transition hover:text-white"
            >
              Create a plan
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </a>
          </div>
        </div>

        {/* Visual: faded background screenshot + floating Blink card */}
        <div className="relative mt-16 md:mt-20">
          <div className="relative ml-auto w-full md:w-[88%]">
            <Image
              src="/plan-details.png"
              alt="TidePay plan details page with specifications, subscribers, and on-chain settlements"
              width={3418}
              height={1898}
              sizes="(min-width: 1152px) 1000px, 100vw"
              className="h-auto w-full rounded-xl border border-white/8 opacity-50"
            />
            {/* Fade toward the right and bottom into the canvas */}
            <div className="pointer-events-none absolute inset-0 bg-linear-to-r from-transparent from-40% to-[#08090a]" />
            <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-transparent from-35% to-[#08090a]" />
          </div>

          <div className="relative z-10 mx-auto -mt-16 w-full max-w-sm sm:-mt-28 md:absolute md:top-10 md:left-0 md:mt-0 md:max-w-85">
            <BlinkPostCard />
          </div>
        </div>
      </div>
    </section>
  );
}
