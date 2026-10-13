"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletButton } from "@/components/wallet-button";
import { Badge } from "@/components/ui/badge";

const TITLES: Record<string, string> = {
  "/": "Overview",
  "/plans": "Plans",
  "/plans/new": "New plan",
  "/subscribers": "Subscribers",
  "/developers": "Developers",
  "/webhooks": "Webhooks & API Keys",
};

import { useState, useRef, useEffect } from "react";
import { useProject } from "@/components/project-context";
import { useTheme } from "@/components/theme-provider";
import { useTidePayUnifiedWallet } from "@/components/wallet/privy-provider";
import { Moon, Sun, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function Topbar() {
  const pathname = usePathname();
  const { activeProject } = useProject();
  const { theme, toggleTheme } = useTheme();
  const { chainType, evmChainId, switchEvmChain } = useTidePayUnifiedWallet();
  const [isEvmDropdownOpen, setIsEvmDropdownOpen] = useState(false);
  const evmDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (evmDropdownRef.current && !evmDropdownRef.current.contains(event.target as Node)) {
        setIsEvmDropdownOpen(false);
      }
    }
    if (isEvmDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isEvmDropdownOpen]);

  const isNestedPlan = pathname.startsWith("/plans/") && pathname !== "/plans";
  let title = TITLES[pathname];
  if (!title && isNestedPlan) {
    title = decodeURIComponent(pathname.replace("/plans/", ""));
  }
  if (!title) {
    title = "TidePay";
  }

  const isLive = activeProject.environment === "live";

  return (
    <header className="flex items-center justify-between gap-2 border-b px-4 py-2.5 sm:py-3 md:px-8">
      <div className="flex items-center gap-2 min-w-0">
        {isNestedPlan && (
          <>
            <Link href="/plans" className="text-muted-foreground hover:text-foreground text-sm sm:text-base shrink-0">
              Plans
            </Link>
            <span className="text-muted-foreground/60 text-sm sm:text-base shrink-0" aria-hidden="true">
              /
            </span>
          </>
        )}
        <h1 className="text-lg sm:text-xl font-semibold tracking-tight truncate">{title}</h1>
      </div>
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        <button
          type="button"
          onClick={toggleTheme}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          aria-label="Toggle theme"
          className="flex size-8 items-center justify-center rounded-lg border border-border/80 text-muted-foreground hover:bg-accent/60 hover:text-foreground transition-colors cursor-pointer shrink-0"
        >
          {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>

        {chainType === "evm" ? (
          <div className="relative" ref={evmDropdownRef}>
            <button
              type="button"
              onClick={() => setIsEvmDropdownOpen((v) => !v)}
              className="h-8 inline-flex items-center gap-1.5 px-2.5 sm:px-3 text-xs font-medium rounded-md border border-blue-500/40 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors cursor-pointer shrink-0"
              title="Switch EVM network"
            >
              <span className="size-1.5 rounded-full bg-blue-400 shadow-[0_0_6px_rgba(96,165,250,0.6)]" />
              <span>{evmChainId === 11155111 ? "Sepolia" : "Base Sepolia"}</span>
              <ChevronDown className="size-3 opacity-70" />
            </button>
            {isEvmDropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 z-50 min-w-44 rounded-xl border border-border/80 bg-popover/95 backdrop-blur-md p-1 shadow-xl text-xs">
                <button
                  type="button"
                  onClick={() => {
                    void switchEvmChain(84532);
                    setIsEvmDropdownOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer",
                    evmChainId === 84532
                      ? "bg-blue-500/10 text-blue-400 font-semibold"
                      : "text-foreground hover:bg-accent/60"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-blue-400" />
                    <span>Base Sepolia</span>
                  </div>
                  {evmChainId === 84532 && <Check className="size-3.5 text-blue-400" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void switchEvmChain(11155111);
                    setIsEvmDropdownOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer",
                    evmChainId === 11155111
                      ? "bg-blue-500/10 text-blue-400 font-semibold"
                      : "text-foreground hover:bg-accent/60"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-indigo-400" />
                    <span>Sepolia</span>
                  </div>
                  {evmChainId === 11155111 && <Check className="size-3.5 text-blue-400" />}
                </button>
              </div>
            )}
          </div>
        ) : chainType === "solana" ? (
          <Badge
            variant="outline"
            className={`h-8 items-center px-2 sm:px-3 text-xs font-medium transition-colors shrink-0 ${
              isLive
                ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                : "border-border/80 text-muted-foreground"
            }`}
          >
            {isLive ? "Mainnet" : "Devnet"}
          </Badge>
        ) : null}

        <WalletButton size="sm" />
      </div>
    </header>
  );
}

