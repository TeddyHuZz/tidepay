"use client";

import { useSyncExternalStore } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { shortAddress } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useTidePayUnifiedWallet } from "@/components/wallet/privy-provider";

const subscribe = () => () => {};

function useIsClient() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}

export function WalletButton({ size = "default" }: { size?: "default" | "sm" | "lg" }) {
  const isClient = useIsClient();
  const {
    connected,
    connecting,
    activeAddress,
    chainType,
    connect,
    disconnect,
  } = useTidePayUnifiedWallet();

  if (!isClient) {
    return (
      <Button variant="outline" size={size} disabled>
        Connect wallet
      </Button>
    );
  }

  if (connected && activeAddress) {
    const isSm = size === "sm";
    const isEvm = chainType === "evm";

    return (
      <div className="flex items-center gap-1.5 sm:gap-2">
        <span
          className={cn(
            "inline-flex items-center rounded-md border border-input font-mono font-medium",
            isSm
              ? "h-8 px-2 text-xs gap-1.5"
              : "h-9 sm:h-11 px-2.5 sm:px-3.5 text-xs sm:text-[13px] gap-2"
          )}
        >
          <span
            className={cn(
              "size-1.5 sm:size-2 rounded-full",
              isEvm ? "bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]" : "bg-primary shadow-[0_0_8px_rgba(20,241,149,0.6)]"
            )}
            aria-hidden="true"
          />
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground mr-0.5">
            {isEvm ? "EVM" : "SOL"}
          </span>
          {shortAddress(activeAddress)}
        </span>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Disconnect wallet"
          className={cn(isSm ? "size-8 [&_svg]:size-3.5" : "size-8 sm:size-11")}
          onClick={() => void disconnect()}
        >
          <LogOut />
        </Button>
      </div>
    );
  }

  return (
    <Button size={size} disabled={connecting} onClick={() => connect()}>
      {connecting ? "Connecting…" : "Connect wallet"}
    </Button>
  );
}
