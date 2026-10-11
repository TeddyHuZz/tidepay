import { LogoMark } from "@/components/logo";
import { DASHBOARD_URL } from "@/lib/config";

export function Footer() {
  return (
    <footer className="bg-[#08090a] pt-16 pb-20 md:pt-20 md:pb-28 text-xs text-zinc-400">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Main Footer Grid: 1 col for Logo + 5 equal columns for links */}
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:grid-cols-6 lg:gap-10">
          {/* TidePay Wave Logo Mark */}
          <div className="col-span-2 sm:col-span-1 md:col-span-1">
            <a href="#" className="inline-block group" aria-label="TidePay Home">
              <LogoMark className="h-6 w-6 rounded-md shadow-sm transition-transform group-hover:scale-105" size={24} />
            </a>
          </div>

          {/* Column 1: Product */}
          <div>
            <div className="text-white font-normal mb-4 text-xs">Product</div>
            <ul className="space-y-3">
              <li>
                <a href="#plans" className="hover:text-white transition-colors">
                  Plans
                </a>
              </li>
              <li>
                <a href="#subscribers" className="hover:text-white transition-colors">
                  Subscribers
                </a>
              </li>
              <li>
                <a href="#developer-apis" className="hover:text-white transition-colors">
                  Webhooks
                </a>
              </li>
              <li>
                <a href="#developer-guide" className="hover:text-white transition-colors">
                  SDK Client
                </a>
              </li>
              <li>
                <a href={DASHBOARD_URL} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                  Merchant Console
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-white transition-colors">
                  Pricing
                </a>
              </li>
            </ul>
          </div>

          {/* Column 2: Features */}
          <div>
            <div className="text-white font-normal mb-4 text-xs">Features</div>
            <ul className="space-y-3">
              <li>
                <a href="#features" className="hover:text-white transition-colors">
                  Token-2022 Pulls
                </a>
              </li>
              <li>
                <a href="#plans" className="hover:text-white transition-colors">
                  Solana Blinks
                </a>
              </li>
              <li>
                <a href="#subscribers" className="hover:text-white transition-colors">
                  Keeper Crank
                </a>
              </li>
              <li>
                <a href="#developer-guide" className="hover:text-white transition-colors">
                  Zero Escrow Risk
                </a>
              </li>
              <li>
                <a href="#subscribers" className="hover:text-white transition-colors">
                  Rent Recovery
                </a>
              </li>
              <li>
                <a href="#developer-apis" className="hover:text-white transition-colors">
                  HMAC Verification
                </a>
              </li>
              <li>
                <a href="#developer-apis" className="hover:text-white transition-colors">
                  Event Dispatcher
                </a>
              </li>
              <li>
                <a href="#changelog" className="hover:text-white transition-colors">
                  Changelog
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Company */}
          <div>
            <div className="text-white font-normal mb-4 text-xs">Company</div>
            <ul className="space-y-3">
              <li>
                <a href="https://colosseum.org" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                  About
                </a>
              </li>
              <li>
                <span className="text-zinc-500">Brand</span>
              </li>
            </ul>
          </div>

          {/* Column 4: Resources */}
          <div>
            <div className="text-white font-normal mb-4 text-xs">Resources</div>
            <ul className="space-y-3">
              <li>
                <a href={`${DASHBOARD_URL}/docs`} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                  Documentation
                </a>
              </li>
              <li>
                <a href={`${DASHBOARD_URL}/webhooks-api`} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                  Developer Guide
                </a>
              </li>
              <li>
                <span className="text-zinc-500 font-mono text-[11px]">@tidepay/sdk</span>
              </li>
              <li>
                <span className="text-zinc-500 font-mono text-[11px]">@tidepay/types</span>
              </li>
              <li>
                <span className="text-zinc-500">Dialect Blinks</span>
              </li>
            </ul>
          </div>

          {/* Column 5: Connect */}
          <div>
            <div className="text-white font-normal mb-4 text-xs">Connect</div>
            <ul className="space-y-3">
              <li>
                <a href="https://x.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                  X (Twitter)
                </a>
              </li>
              <li>
                <a href="https://github.com/TeddyHuZz/tidepay" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                  GitHub
                </a>
              </li>
              <li>
                <a href="https://discord.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                  Community
                </a>
              </li>
              <li>
                <a href={DASHBOARD_URL} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                  Console
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Legal Sub-links matching Linear */}
        <div className="mt-16 md:mt-24 flex items-center gap-6 text-xs text-zinc-500 font-normal">
          <a href="#" className="hover:text-zinc-300 transition-colors">
            Privacy
          </a>
          <a href="#" className="hover:text-zinc-300 transition-colors">
            Terms
          </a>
          <a href="#" className="hover:text-zinc-300 transition-colors">
            DPA
          </a>
          <a href="#" className="hover:text-zinc-300 transition-colors">
            Security
          </a>
        </div>
      </div>
    </footer>
  );
}
