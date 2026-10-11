import Link from "next/link";
import { Zap, Terminal, Shield, ExternalLink } from "lucide-react";

const DASHBOARD_URL = process.env.NEXT_PUBLIC_DASHBOARD_URL || "http://localhost:3000";

export function Footer() {
  return (
    <footer className="border-t border-white/8 bg-[#060708] py-16 text-xs text-zinc-400">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10 pb-12 border-b border-white/6">
          {/* Brand Info */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-linear-to-tr from-[#9945FF] to-[#14F195] p-0.5">
                <div className="flex h-full w-full items-center justify-center rounded bg-[#08090a]">
                  <Zap className="h-3 w-3 text-[#14F195]" />
                </div>
              </div>
              <span className="font-semibold text-white text-sm">TidePay</span>
            </div>
            <p className="text-zinc-500 max-w-sm leading-relaxed mb-4">
              Non-custodial, time-locked recurring billing engine for Solana. Powered by Anchor 0.30, Token-2022, and Solana Actions.
            </p>
            <div className="flex items-center gap-2 text-[11px] font-mono text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Devnet Network Status: Operational</span>
            </div>
          </div>

          {/* Nav Col 1 */}
          <div>
            <h4 className="font-semibold text-white mb-3 text-xs uppercase tracking-wider font-mono">
              Product
            </h4>
            <ul className="space-y-2">
              <li>
                <a href="#features" className="hover:text-white transition">
                  Features
                </a>
              </li>
              <li>
                <a href="#architecture" className="hover:text-white transition">
                  Protocol Flow
                </a>
              </li>
              <li>
                <a href="#blinks" className="hover:text-white transition">
                  Solana Blinks
                </a>
              </li>
              <li>
                <a
                  href={`${DASHBOARD_URL}/demo`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition flex items-center gap-1"
                >
                  Demo SaaS <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            </ul>
          </div>

          {/* Nav Col 2 */}
          <div>
            <h4 className="font-semibold text-white mb-3 text-xs uppercase tracking-wider font-mono">
              Developers
            </h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://github.com/TeddyHuZz/tidepay"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition"
                >
                  GitHub Repository
                </a>
              </li>
              <li>
                <a
                  href={`${DASHBOARD_URL}/plans/new`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition"
                >
                  Plan Creation Console
                </a>
              </li>
              <li>
                <span className="text-zinc-600 font-mono">@tidepay/sdk</span>
              </li>
              <li>
                <span className="text-zinc-600 font-mono">@tidepay/types</span>
              </li>
            </ul>
          </div>

          {/* Nav Col 3 */}
          <div>
            <h4 className="font-semibold text-white mb-3 text-xs uppercase tracking-wider font-mono">
              Colosseum
            </h4>
            <ul className="space-y-2">
              <li>
                <a href="#fast-forward" className="hover:text-white transition">
                  60s Fast-Forward
                </a>
              </li>
              <li>
                <span className="text-zinc-500">Solana Hackathon 2026</span>
              </li>
              <li>
                <span className="text-zinc-500">Crypto Rails Track</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-zinc-500 font-mono">
          <div>© 2026 TidePay Protocol. Non-Custodial Invariance Guaranteed.</div>
          <div className="flex items-center gap-4">
            <span>Built on Solana</span>
            <span>Anchor Framework</span>
            <span>Dialect Blinks</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
