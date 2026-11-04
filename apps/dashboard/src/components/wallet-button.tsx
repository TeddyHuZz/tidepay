"use client";

import { useState, useSyncExternalStore } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { ChevronDown, ExternalLink, LogOut } from "lucide-react";
import { CopyButton } from "@/components/copy-button";
import { Button } from "@/components/ui/button";
import { useNearMerchant } from "@/hooks/use-near-merchant";
import { NEAR_CONTRACT_ID, nearExplorerUrl } from "@/lib/near/config";
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
  const near = useNearMerchant();
  const [open, setOpen] = useState(false);

  if (!isClient) {
    return (
      <Button variant="outline" size={size} disabled>
        Connect wallet
      </Button>
    );
  }

  if (connected && publicKey) {
    const isSm = size === "sm";
    const settingUp = near.status === "deriving" || near.status === "funding" || near.status === "registering";
    return (
      <div className="relative flex items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "inline-flex cursor-pointer items-center rounded-md border border-input font-mono font-medium outline-none transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            isSm
              ? "h-8 px-2 text-xs gap-1.5"
              : "h-9 sm:h-11 px-2.5 sm:px-3.5 text-xs sm:text-[13px] gap-2"
          )}
        >
          <span className="size-1.5 sm:size-2 rounded-full bg-primary" aria-hidden="true" />
          {shortAddress(publicKey.toBase58())}
          <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden="true" />
        </button>
        {open && (
          <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-lg border border-border bg-popover p-3 text-xs shadow-xl">
            <div className="mb-2 font-semibold text-foreground">Accounts</div>
            <div className="flex items-center justify-between border-b border-border/50 py-1.5">
              <div>
                <div className="font-medium text-muted-foreground">Solana Devnet</div>
                <div className="font-mono text-[11px]">{shortAddress(publicKey.toBase58())}</div>
              </div>
              <CopyButton value={publicKey.toBase58()} label="Copy Solana address" />
            </div>
            <div className="flex items-center justify-between gap-2 py-1.5">
              <div className="min-w-0">
                <div className="font-medium text-muted-foreground">NEAR Testnet</div>
                {near.accountId ? (
                  <div className="font-mono text-[11px]">{shortAddress(near.accountId)}</div>
                ) : (
                  <div className="text-[11px] text-muted-foreground">Created from this wallet when you first use NEAR.</div>
                )}
              </div>
              {near.accountId ? (
                <div className="flex shrink-0 items-center">
                  <CopyButton value={near.accountId} label="Copy NEAR account id" />
                  <a href={nearExplorerUrl("address", near.accountId)} target="_blank" rel="noreferrer" aria-label="View NEAR account" className="p-2 text-muted-foreground hover:text-foreground">
                    <ExternalLink className="size-3.5" />
                  </a>
                </div>
              ) : (
                <Button size="sm" variant="outline" className="shrink-0" disabled={settingUp || !NEAR_CONTRACT_ID} onClick={() => void near.prepare()}>
                  {settingUp ? "Setting up…" : "Set up"}
                </Button>
              )}
            </div>
            {near.error && <p role="alert" className="mt-1 text-[11px] text-destructive">{near.error}</p>}
          </div>
        )}
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
