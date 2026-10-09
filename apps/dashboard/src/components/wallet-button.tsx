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

export function WalletButton({ size = "default" }: { size?: "default" | "lg" }) {
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
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex h-11 items-center gap-2 rounded-md border border-input px-3.5 font-mono text-[13px] font-medium">
          <span className="size-2 rounded-full bg-primary" aria-hidden="true" />
          {shortAddress(publicKey.toBase58())}
        </span>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Disconnect wallet"
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
