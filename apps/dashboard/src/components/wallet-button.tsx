"use client";

import { useSyncExternalStore } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { shortAddress } from "@/lib/format";

const subscribe = () => () => {};

// Wallet state only exists in the browser; render a stable placeholder
// during SSR and hydration so the markup never mismatches.
function useIsClient() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}

import { cn } from "@/lib/utils";

export function WalletButton({ size = "default" }: { size?: "default" | "sm" | "lg" }) {
  const isClient = useIsClient();
  const { publicKey, connected, connecting, disconnect } = useWallet();
  const { setVisible } = useWalletModal();

  if (!isClient) {
    return (
      <Button variant="outline" size={size} disabled>
        Connect wallet
      </Button>
    );
  }

  if (connected && publicKey) {
    const isSm = size === "sm";
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
          <span className="size-1.5 sm:size-2 rounded-full bg-primary" aria-hidden="true" />
          {shortAddress(publicKey.toBase58())}
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
    <Button size={size} disabled={connecting} onClick={() => setVisible(true)}>
      {connecting ? "Connecting…" : "Connect wallet"}
    </Button>
  );
}
