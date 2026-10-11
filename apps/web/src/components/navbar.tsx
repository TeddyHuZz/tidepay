"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Menu, X, ShieldCheck, Terminal, Zap } from "lucide-react";

const DASHBOARD_URL = process.env.NEXT_PUBLIC_DASHBOARD_URL || "http://localhost:3000";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/8 bg-[#08090a]/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link href="/" className="group flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-tr from-[#9945FF] to-[#14F195] p-0.5 shadow-sm transition-transform group-hover:scale-105">
              <div className="flex h-full w-full items-center justify-center rounded-[6px] bg-[#08090a]">
                <Zap className="h-4 w-4 text-[#14F195]" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-lg tracking-tight text-white">TidePay</span>
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono font-medium text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Devnet
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6 text-sm text-zinc-400">
            <a href="#features" className="transition hover:text-white">
              Features
            </a>
            <a href="#architecture" className="transition hover:text-white">
              Architecture
            </a>
            <a href="#blinks" className="transition hover:text-white">
              Solana Blinks
            </a>
            <a href="#fast-forward" className="transition hover:text-white">
              Judge Mode
            </a>
            <a
              href={`${DASHBOARD_URL}/demo`}
              className="transition hover:text-white"
              target="_blank"
              rel="noopener noreferrer"
            >
              Live Demo
            </a>
          </nav>
        </div>

        {/* Right Action Buttons */}
        <div className="hidden sm:flex items-center gap-3">
          <a
            href="https://github.com/TeddyHuZz/tidepay"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/3 px-3 py-1.5 text-xs font-mono text-zinc-300 transition hover:bg-white/8 hover:text-white"
          >
            <Terminal className="h-3.5 w-3.5 text-zinc-400" />
            GitHub
          </a>
          <a
            href={DASHBOARD_URL}
            className="group inline-flex items-center gap-2 rounded-lg bg-white px-3.5 py-1.5 text-xs font-medium text-black transition hover:bg-zinc-200"
          >
            Launch Console
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </a>
        </div>

        {/* Mobile menu trigger */}
        <div className="flex sm:hidden items-center gap-2">
          <a
            href={DASHBOARD_URL}
            className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-black"
          >
            Console
          </a>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-lg p-2 text-zinc-400 hover:text-white focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="border-b border-white/8 bg-[#0c0d12] px-4 py-4 md:hidden">
          <div className="flex flex-col space-y-3 text-sm text-zinc-300">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-white"
            >
              Features
            </a>
            <a
              href="#architecture"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-white"
            >
              Architecture
            </a>
            <a
              href="#blinks"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-white"
            >
              Solana Blinks
            </a>
            <a
              href="#fast-forward"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-white"
            >
              Judge Fast-Forward
            </a>
            <a
              href={`${DASHBOARD_URL}/demo`}
              onClick={() => setMobileMenuOpen(false)}
              target="_blank"
              rel="noopener noreferrer"
              className="py-1 text-[#14F195] hover:underline"
            >
              Live Demo SaaS →
            </a>
            <div className="pt-2 border-t border-white/8 flex items-center justify-between">
              <span className="text-xs text-zinc-500 font-mono">Devnet Cluster</span>
              <a
                href={DASHBOARD_URL}
                className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-black"
              >
                Launch Console →
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
