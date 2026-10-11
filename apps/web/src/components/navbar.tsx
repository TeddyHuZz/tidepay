"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Menu, X, ShieldCheck, Terminal } from "lucide-react";
import { LogoMark } from "@/components/logo";

const DASHBOARD_URL = process.env.NEXT_PUBLIC_DASHBOARD_URL || "http://localhost:3000";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/8 bg-[#08090a]/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-8">
          <Link
            href="/"
            onClick={(e) => {
              if (window.location.pathname === "/") {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: "smooth" });
              }
            }}
            className="group flex items-center gap-2.5"
            aria-label="TidePay Home"
          >
            <LogoMark className="h-7 w-7 rounded-md shadow-sm transition-transform group-hover:scale-105" size={28} />
            <span className="font-semibold text-lg tracking-tight text-white">TidePay</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6 text-sm text-zinc-400">
            <a href="#features" className="transition hover:text-white">
              Features
            </a>
            <a href="#plans" className="transition hover:text-white">
              Plans
            </a>
            <a href="#subscribers" className="transition hover:text-white">
              Subscribers
            </a>
            <a href="#developer-apis" className="transition hover:text-white">
              Developers
            </a>
            <a href="#developer-guide" className="transition hover:text-white">
              Docs
            </a>
            <a href="#changelog" className="transition hover:text-white">
              Changelog
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
              href="#plans"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-white"
            >
              Plans
            </a>
            <a
              href="#subscribers"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-white"
            >
              Subscribers
            </a>
            <a
              href="#developer-apis"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-white"
            >
              Developers
            </a>
            <a
              href="#developer-guide"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-white"
            >
              Docs
            </a>
            <a
              href="#changelog"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-white"
            >
              Changelog
            </a>
            <div className="pt-2 border-t border-white/8 flex items-center justify-between">
              <a
                href="https://github.com/TeddyHuZz/tidepay"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-zinc-400 font-mono hover:text-white"
              >
                GitHub ↗
              </a>
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
