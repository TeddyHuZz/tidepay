"use client";

import type { ReactNode } from "react";
import { useMerchantData } from "@/components/merchant-data-provider";
import { WalletButton } from "@/components/wallet-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { MerchantData } from "@/lib/types";

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
    return (
      <Card role="alert" className="flex flex-col items-center gap-4 px-6 py-14 text-center">
        <h2 className="text-[15px] font-semibold">Something went wrong</h2>
        <p className="max-w-sm text-sm text-muted-foreground">{state.message}</p>
        <Button onClick={refresh}>Try again</Button>
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
