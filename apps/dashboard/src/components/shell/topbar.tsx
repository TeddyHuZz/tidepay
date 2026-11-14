"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletButton } from "@/components/wallet-button";

const TITLES: Record<string, string> = {
  "/": "Overview",
  "/plans": "Plans",
  "/plans/new": "New plan",
  "/subscribers": "Subscribers",
  "/developers": "Developers",
  "/webhooks": "Webhooks & API Keys",
};

import { useTheme } from "@/components/theme-provider";
import { Moon, Sun } from "lucide-react";

export function Topbar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const isNestedPlan = pathname.startsWith("/plans/") && pathname !== "/plans";
  let title = TITLES[pathname];
  if (!title && isNestedPlan) {
    title = decodeURIComponent(pathname.replace("/plans/", ""));
  }
  if (!title) {
    title = "TidePay";
  }

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
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        <button
          type="button"
          onClick={toggleTheme}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          aria-label="Toggle theme"
          className="flex size-8 items-center justify-center rounded-lg border border-border/80 text-muted-foreground hover:bg-accent/60 hover:text-foreground transition-colors cursor-pointer shrink-0"
        >
          {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>
        <WalletButton size="sm" />
      </div>
    </header>
  );
}

