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

import { useProject } from "@/components/project-context";

export function Topbar() {
  const pathname = usePathname();
  const { activeProject } = useProject();
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
    <header className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 md:px-8">
      <div className="flex items-center gap-2 text-xl leading-7">
        {isNestedPlan && (
          <>
            <Link href="/plans" className="text-muted-foreground hover:text-foreground">
              Plans
            </Link>
            <span className="text-muted-foreground/60" aria-hidden="true">
              /
            </span>
          </>
        )}
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        <Badge
          variant="outline"
          className={`h-8 items-center px-3 font-medium transition-colors ${
            isLive
              ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
              : "border-border/80 text-muted-foreground"
          }`}
        >
          {isLive ? "Mainnet" : "Devnet"}
        </Badge>
        <WalletButton />
      </div>
    </header>
  );
}

