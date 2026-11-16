"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { ChevronDown, ExternalLink, LogOut } from "lucide-react";
import { CopyButton } from "@/components/copy-button";
import { useProject } from "@/components/project-context";
import { Button } from "@/components/ui/button";
import { WithdrawModal } from "@/components/wallet/withdraw-modal";
import { useNearMerchant } from "@/hooks/use-near-merchant";
import { NEAR_CONTRACT_ID, nearExplorerUrl } from "@/lib/near/config";
import { shortAddress } from "@/lib/format";
import type { WithdrawChain } from "@/lib/withdraw";

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
  const { activeProject } = useProject();
  const near = useNearMerchant();
  const [open, setOpen] = useState(false);
  const [withdrawChain, setWithdrawChain] = useState<WithdrawChain | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

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
    const solanaLabel = activeProject.environment === "live" ? "Solana Mainnet" : "Solana Devnet";
    const openWithdraw = (chain: WithdrawChain) => {
      setOpen(false);
      setWithdrawChain(chain);
    };
    return (
      <div ref={menuRef} className="relative flex items-center gap-1.5 sm:gap-2">
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
          <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-border bg-popover p-3.5 text-xs shadow-xl">
            <div className="mb-1.5 font-semibold text-foreground">Accounts</div>
            <div className="flex items-center justify-between gap-2 border-b border-border/50 py-2">
              <div className="min-w-0">
                <div className="font-medium text-muted-foreground">{solanaLabel}</div>
                <div className="font-mono text-[11px]">{shortAddress(publicKey.toBase58())}</div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2 text-[11px]"
                  onClick={() => openWithdraw("solana")}
                >
                  Withdraw
                </Button>
                <CopyButton value={publicKey.toBase58()} label="Copy Solana address" />
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 py-2">
              <div className="min-w-0">
                <div className="font-medium text-muted-foreground">NEAR Testnet</div>
                {near.accountId ? (
                  <div className="font-mono text-[11px]">{shortAddress(near.accountId)}</div>
                ) : (
                  <div className="text-[11px] text-muted-foreground">Created from this wallet when you first use NEAR.</div>
                )}
              </div>
              {near.accountId ? (
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 px-2 text-[11px]"
                    onClick={() => openWithdraw("near")}
                  >
                    Withdraw
                  </Button>
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
        {withdrawChain && <WithdrawModal initialChain={withdrawChain} onClose={() => setWithdrawChain(null)} />}
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
