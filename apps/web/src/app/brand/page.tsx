import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Sparkles, Download, CheckCircle2, XCircle, Copy } from "lucide-react";
import { LogoMark } from "@/components/logo";

export const metadata: Metadata = {
  title: "Brand Assets & Guidelines | TidePay",
  description:
    "Official brand assets, logo downloads, color palette, and typography guidelines for TidePay on Solana.",
};

const BRAND_COLORS = [
  {
    name: "TidePay Teal",
    role: "Primary Brand / Logo",
    hex: "#00BFB3",
    rgb: "rgb(0, 191, 179)",
    bgClass: "bg-[#00BFB3]",
    textColor: "text-[#00BFB3]",
  },
  {
    name: "Solana Emerald",
    role: "Success & Protocol Action",
    hex: "#14F195",
    rgb: "rgb(20, 241, 149)",
    bgClass: "bg-[#14F195]",
    textColor: "text-[#14F195]",
  },
  {
    name: "Solana Violet",
    role: "Ecosystem Accent",
    hex: "#9945FF",
    rgb: "rgb(153, 69, 255)",
    bgClass: "bg-[#9945FF]",
    textColor: "text-[#9945FF]",
  },
  {
    name: "Obsidian Surface",
    role: "Container Card & Panels",
    hex: "#0F1015",
    rgb: "rgb(15, 16, 21)",
    bgClass: "bg-[#0F1015]",
    textColor: "text-zinc-200",
  },
  {
    name: "Void Black",
    role: "Atmospheric Canvas",
    hex: "#08090A",
    rgb: "rgb(8, 9, 10)",
    bgClass: "bg-[#08090A]",
    textColor: "text-zinc-400",
  },
];

export default function BrandPage() {
  const svgMarkup = `<svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="28" height="28" rx="6" fill="#00BFB3" />
  <path d="M5 15c3 0 3-4 6-4s3 4 6 4 3-4 6-4M5 20c3 0 3-4 6-4s3 4 6 4 3-4 6-4" stroke="#022425" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
</svg>`;

  return (
    <div className="relative min-h-screen py-16 sm:py-24">
      {/* Background ambient glow */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-125 w-200 -translate-x-1/2 rounded-full bg-linear-to-b from-[#00bfb3]/15 via-[#9945ff]/5 to-transparent blur-3xl" />
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
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#00bfb3]/20 bg-[#00bfb3]/10 px-2.5 py-0.5 text-[11px] font-mono font-medium text-[#00bfb3]">
              <Sparkles className="h-3 w-3" /> Design System
            </span>
            <span className="text-xs font-mono text-zinc-500">Official Media Kit</span>
          </div>
          <h1 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-white font-display">
            Brand Assets &amp; Guidelines
          </h1>
          <p className="mt-3 text-base text-zinc-400 max-w-2xl font-sans leading-relaxed">
            Resources, vector marks, and visual standards for partners, developers, and press featuring TidePay.
          </p>
        </div>

        {/* Content Body */}
        <div className="space-y-14 text-sm leading-relaxed text-zinc-300 font-sans border-t border-white/8 pt-10">
          {/* Logo Mark Section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-white font-display text-lg sm:text-xl font-medium">The TidePay Wave Mark</h2>
                <p className="text-xs text-zinc-400 mt-1">Our mark represents recurring tidal pulses of value on the Solana blockchain.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {/* Dark Canvas Preview */}
              <div className="rounded-2xl border border-white/8 bg-[#08090a] p-8 flex flex-col items-center justify-center gap-4 text-center">
                <LogoMark size={64} className="h-16 w-16 shadow-lg shadow-[#00bfb3]/10" />
                <div>
                  <div className="flex items-center gap-2 justify-center">
                    <span className="text-xl font-semibold text-white tracking-tight">TidePay</span>
                  </div>
                  <span className="text-xs font-mono text-zinc-500 mt-1 block">Dark Canvas (Default)</span>
                </div>
              </div>

              {/* Obsidian Card Preview */}
              <div className="rounded-2xl border border-white/8 bg-[#0f1015] p-8 flex flex-col items-center justify-center gap-4 text-center">
                <LogoMark size={64} className="h-16 w-16 shadow-md" />
                <div>
                  <div className="flex items-center gap-2 justify-center">
                    <span className="text-xl font-semibold text-white tracking-tight">TidePay</span>
                  </div>
                  <span className="text-xs font-mono text-zinc-500 mt-1 block">Elevated Card Canvas</span>
                </div>
              </div>
            </div>

            {/* SVG Snippet Card */}
            <div className="rounded-xl border border-white/8 bg-black/40 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-[#00bfb3]">LogoMark Vector SVG</span>
                <span className="font-mono text-[11px] text-zinc-500">28x28 viewBox</span>
              </div>
              <pre className="font-mono text-[11px] text-zinc-400 overflow-x-auto p-2 bg-white/2 rounded">
                {svgMarkup}
              </pre>
            </div>
          </section>

          {/* Color Palette Section */}
          <section className="space-y-4">
            <div>
              <h2 className="text-white font-display text-lg sm:text-xl font-medium">Color Palette</h2>
              <p className="text-xs text-zinc-400 mt-1">Carefully tuned palette honoring the Solana ecosystem and ocean-inspired settlement waves.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
              {BRAND_COLORS.map((color) => (
                <div key={color.name} className="rounded-xl border border-white/8 bg-white/2 p-3 space-y-3">
                  <div className={`h-16 w-full rounded-lg ${color.bgClass} shadow-inner flex items-end p-2`}>
                    <span className="font-mono text-[10px] font-semibold bg-black/40 backdrop-blur-xs px-1.5 py-0.5 rounded text-white">
                      {color.hex}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">{color.name}</h3>
                    <p className="text-xs text-zinc-400">{color.role}</p>
                    <p className="font-mono text-[11px] text-zinc-500 mt-1">{color.rgb}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Typography */}
          <section className="space-y-4">
            <div>
              <h2 className="text-white font-display text-lg sm:text-xl font-medium">Typography System</h2>
              <p className="text-xs text-zinc-400 mt-1">Tailored type scale combining high-tech display headers with legible body typography.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div className="rounded-xl border border-white/8 bg-white/2 p-4 space-y-2">
                <span className="font-mono text-xs text-[#14f195]">Display Headings</span>
                <div className="text-2xl font-bold font-display text-white">Array</div>
                <p className="text-xs text-zinc-400">Used for titles, hero badges, and brand emphasis.</p>
              </div>
              <div className="rounded-xl border border-white/8 bg-white/2 p-4 space-y-2">
                <span className="font-mono text-xs text-[#00bfb3]">Body &amp; UI</span>
                <div className="text-2xl font-bold font-sans text-white">Khand</div>
                <p className="text-xs text-zinc-400">Optimized for rapid scanning, buttons, and dashboard metrics.</p>
              </div>
              <div className="rounded-xl border border-white/8 bg-white/2 p-4 space-y-2">
                <span className="font-mono text-xs text-[#9945ff]">Code &amp; Crypto</span>
                <div className="text-2xl font-mono text-white">JetBrains Mono</div>
                <p className="text-xs text-zinc-400">Addresses, PDAs, token amounts, and developer code blocks.</p>
              </div>
            </div>
          </section>

          {/* Brand Guidelines */}
          <section className="space-y-4">
            <h2 className="text-white font-display text-lg sm:text-xl font-medium">Guidelines &amp; Correct Usage</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-2 text-xs">
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <CheckCircle2 className="h-4 w-4" /> Do&apos;s
                </div>
                <ul className="space-y-1 text-zinc-300">
                  <li>• Use the official teal logo mark on dark backgrounds.</li>
                  <li>• Maintain generous whitespace around the logomark.</li>
                  <li>• Spell the name as &quot;TidePay&quot; (capital T and P).</li>
                </ul>
              </div>
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 space-y-2 text-xs">
                <div className="flex items-center gap-1.5 text-rose-400 font-semibold">
                  <XCircle className="h-4 w-4" /> Don&apos;ts
                </div>
                <ul className="space-y-1 text-zinc-300">
                  <li>• Do not distort, stretch, or rotate the wave logomark.</li>
                  <li>• Do not change the inner wave geometry.</li>
                  <li>• Do not spell as &quot;Tide pay&quot; or &quot;tidePay&quot;.</li>
                </ul>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
