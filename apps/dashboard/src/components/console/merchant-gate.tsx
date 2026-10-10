"use client";

import type { ReactNode } from "react";
import { useMerchantData } from "@/components/merchant-data-provider";
import { WalletButton } from "@/components/wallet-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { MerchantData } from "@/lib/types";

import { useProject } from "@/components/project-context";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AlertTriangle, RefreshCw, RotateCcw, Settings, Terminal } from "lucide-react";

export interface MerchantGateMeta {
  refresh: () => void;
  isRefreshing: boolean;
  lastRefreshedAt: number | null;
}

/** Renders merchant data once loaded; handles disconnected, loading and error states. */
export function MerchantGate({
  children,
}: {
  children: (data: MerchantData, meta: MerchantGateMeta) => ReactNode;
}) {
  const { state, refresh, isRefreshing, lastRefreshedAt } = useMerchantData();
  const { activeProject, updateActiveProject, openSettingsModal } = useProject();

  if (state.status === "disconnected") {
    return (
      <Card className="flex flex-col items-center gap-4 px-6 py-14 text-center">
        <h2 className="text-[15px] font-semibold">Connect your merchant wallet</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Your plans, subscribers and revenue are read from Solana Devnet for the connected wallet.
        </p>
        <WalletButton />
      </Card>
    );
  }

  if (state.status === "loading") {
    return (
      <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-4">
          {[0, 1, 2, 3].map((key) => (
            <div key={key} className="h-27.5 animate-pulse rounded-lg border bg-card" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-lg border bg-card" />
      </div>
    );
  }

  if (state.status === "error") {
    const errorInfo = state.errorInfo;
    const isCustomRpc =
      (activeProject.environment === "sandbox" && !!activeProject.customDevnetRpcUrl) ||
      (activeProject.environment === "live" && (!!activeProject.customMainnetRpcUrl || !!activeProject.customRpcUrl));

    const handleResetRpc = () => {
      if (activeProject.environment === "sandbox") {
        updateActiveProject({ customDevnetRpcUrl: "" });
      } else {
        updateActiveProject({ customMainnetRpcUrl: "", customRpcUrl: "" });
      }
      setTimeout(() => refresh(), 150);
    };

    return (
      <Card role="alert" className="flex flex-col gap-5 p-6 md:p-8 max-w-2xl mx-auto border-border/80 bg-card/60 backdrop-blur-sm shadow-md">
        <div className="flex items-start gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-destructive/30 bg-destructive/10 text-destructive">
            <AlertTriangle className="size-5.5" />
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-semibold text-foreground">
                {errorInfo?.title || "Unable to Load On-Chain Data"}
              </h2>
              {errorInfo?.status && (
                <Badge variant="outline" className="border-destructive/40 bg-destructive/10 text-destructive text-[11px] font-mono">
                  HTTP {errorInfo.status}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {errorInfo?.hint || state.message}
            </p>
          </div>
        </div>

        {/* Developer Diagnostics Box */}
        <div className="flex flex-col gap-2.5 rounded-lg border border-border/70 bg-background/70 p-3.5 text-xs">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/40 pb-2">
            <span className="flex items-center gap-1.5">
              <Terminal className="size-3.5" /> Developer Diagnostics
            </span>
            <span className="font-mono text-[10px] text-muted-foreground/80">
              {errorInfo?.cluster || (activeProject.environment === "live" ? "Solana Mainnet" : "Solana Devnet")}
            </span>
          </div>

          <div className="flex flex-col gap-2 pt-1 font-mono text-[11px]">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <span className="text-muted-foreground font-sans text-xs min-w-24">Target RPC:</span>
              <span className="bg-accent/40 rounded px-1.5 py-0.5 text-foreground break-all select-all border border-border/50">
                {errorInfo?.rpcEndpoint || "Default Cluster"}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2">
              <span className="text-muted-foreground font-sans text-xs min-w-24 pt-0.5">Raw Error:</span>
              <span className="bg-destructive/10 text-destructive rounded px-1.5 py-0.5 break-all select-all border border-destructive/20 font-semibold">
                {errorInfo?.message || state.message}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2.5 pt-1 flex-wrap">
          <Button
            onClick={() => openSettingsModal("network")}
            className="gap-2 text-xs"
          >
            <Settings className="size-3.5" />
            Configure RPC in Settings
          </Button>

          {isCustomRpc && (
            <Button
              variant="outline"
              onClick={handleResetRpc}
              className="gap-2 text-xs"
            >
              <RotateCcw className="size-3.5" />
              Revert to Default RPC
            </Button>
          )}

          <Button
            variant="ghost"
            onClick={refresh}
            disabled={isRefreshing}
            className="gap-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={cn("size-3.5", isRefreshing && "animate-spin")} />
            Try again
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {state.isSample && (
        <p className="rounded-md border border-warning/40 bg-warning-soft px-3 py-2 text-[13px] text-warning">
          Showing sample data. Unset NEXT_PUBLIC_USE_SAMPLE_DATA to read from Devnet.
        </p>
      )}
      {children(state.data, { refresh, isRefreshing, lastRefreshedAt })}
    </div>
  );
}
