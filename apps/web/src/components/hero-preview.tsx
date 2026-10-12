import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { DASHBOARD_URL } from "@/lib/config";

export function HeroPreview() {
  return (
    <section className="relative overflow-hidden pt-16 md:pt-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Headline */}
        <h1 className="max-w-4xl text-[40px] font-medium leading-[1.05] tracking-tight text-white sm:text-[52px] md:text-[64px]">
          The recurring billing engine
          <br className="hidden sm:block" /> for Solana merchants
        </h1>

        {/* Subline + announcement */}
        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl text-base leading-relaxed text-zinc-400">
            Non-custodial subscriptions with delegated pull billing. Designed for Solana Blinks.
          </p>
          <a
            href={DASHBOARD_URL}
            className="group inline-flex shrink-0 items-center gap-2 rounded-full border border-[#00bfb3]/30 bg-[#00bfb3]/10 px-4 py-2 text-sm font-medium text-[#00bfb3] transition hover:border-[#00bfb3]/60 hover:bg-[#00bfb3]/20 hover:text-white"
          >
            <span>Get Started</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </a>
        </div>
      </div>

      {/* Product screenshot */}
      <div className="relative mx-auto mt-14 max-w-6xl px-4 sm:px-6 md:mt-16 lg:px-8">
        {/* Floor glow beneath the frame */}
        <div className="pointer-events-none absolute inset-x-0 -bottom-24 -z-10 h-72 bg-[radial-gradient(ellipse_60%_100%_at_50%_100%,rgba(255,255,255,0.08),transparent_70%)]" />

        <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#0f1015] p-1.5 shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_40px_120px_-20px_rgba(0,0,0,0.8)] sm:p-2">
          <Image
            src="/merchant-dashboard.png"
            alt="TidePay merchant dashboard showing revenue, plan performance, and on-chain settlements"
            width={3414}
            height={1894}
            priority
            sizes="(min-width: 1152px) 1152px, 100vw"
            className="h-auto w-full rounded-lg border border-white/6"
          />
          {/* Bottom fade into the canvas */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-b from-transparent to-[#08090a]" />
        </div>
      </div>
    </section>
  );
}
