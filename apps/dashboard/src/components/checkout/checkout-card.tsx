"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { useSubscription } from "@/hooks/use-subscription";
import { useEvmSubscription } from "@/hooks/use-evm-subscription";
import { useTidePayUnifiedWallet } from "@/components/wallet/privy-provider";
import { explorerUrl } from "@/lib/chain/config";
import { formatDateTimeUtc } from "@/lib/format";
import { intervalUnit } from "@/lib/types";

interface CheckoutCardProps {
  planAddress: string;
  name: string;
  priceUsdc: string;
  intervalSeconds: number;
  active: boolean;
  isSample: boolean;
  merchant?: string;
}

export function CheckoutCard({
  planAddress,
  name,
  priceUsdc,
  intervalSeconds,
  active,
  isSample,
  merchant,
}: CheckoutCardProps) {
  const isEvmPlan = planAddress.startsWith("0x");

  // Solana hooks
  const solanaWallet = useWallet();
  const solanaModal = useWalletModal();
  const solanaSub = useSubscription(isSample || isEvmPlan ? null : planAddress);

  // EVM hooks
  const unifiedWallet = useTidePayUnifiedWallet();
  const evmSub = useEvmSubscription(isEvmPlan ? planAddress : null);

  const unit = intervalUnit(intervalSeconds);

  // Unified status resolution
  const isConnected = isEvmPlan
    ? Boolean(unifiedWallet.evmAddress)
    : solanaWallet.connected;

  const isPending = isEvmPlan
    ? evmSub.action.status === "pending"
    : solanaSub.action.status === "pending";

  const isSubscribed = isEvmPlan
    ? evmSub.lookup.status === "active"
    : solanaSub.lookup.status === "active" || solanaSub.lookup.status === "past_due";

  const isOwner = Boolean(
    isConnected &&
      merchant &&
      (isEvmPlan
        ? unifiedWallet.evmAddress?.toLowerCase() === merchant.toLowerCase()
        : solanaWallet.publicKey?.toBase58() === merchant)
  );

  const handleDisconnect = async () => {
    try {
      if (isEvmPlan) {
        await unifiedWallet.disconnect();
      } else {
        await solanaWallet.disconnect();
      }
    } catch (err) {
      console.error("[TidePay] Disconnect error:", err);
    }
  };

  const handleConnect = () => {
    if (isEvmPlan) {
      unifiedWallet.connect("evm");
    } else {
      solanaModal.setVisible(true);
    }
  };

  const handleSubscribe = () => {
    if (isEvmPlan) {
      void evmSub.subscribe();
    } else {
      void solanaSub.subscribe();
    }
  };

  const handleCancel = () => {
    if (isEvmPlan) {
      void evmSub.cancel();
    } else {
      void solanaSub.cancel();
    }
  };

  const rows = [
    { label: "Billed every", value: unit },
    { label: "Network", value: isEvmPlan ? "Ethereum / Base Sepolia" : "Solana Devnet" },
    { label: "Token", value: "USDC" },
    { label: "First charge", value: "Today, when you subscribe" },
  ];

  return (
    <Card className="w-full max-w-md">
      <CardContent className="flex flex-col gap-6 p-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded border ${
                isEvmPlan
                  ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                  : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
              }`}
            >
              {isEvmPlan ? "EVM Plan" : "Solana Plan"}
            </span>
          </div>
          <CardTitle className="text-lg">{name}</CardTitle>
          <CardDescription className="mt-1">Recurring subscription, paid in USDC.</CardDescription>
        </div>

        <div className="text-3xl font-semibold leading-9 tracking-tight tabular-nums">
          {priceUsdc} <span className="text-sm font-medium text-muted-foreground">USDC / {unit}</span>
        </div>

        <dl className="flex flex-col">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-3 border-t py-2.5 text-sm">
              <dt className="text-muted-foreground">{row.label}</dt>
              <dd className="font-medium">{row.value}</dd>
            </div>
          ))}
        </dl>

        {isOwner && (
          <p className="rounded-md border border-warning/40 bg-warning-soft px-3 py-2 text-[13px] text-warning">
            You are currently connected as the merchant of this plan. To test subscribing, please switch to a separate subscriber wallet in your wallet extension.
          </p>
        )}

        <div className="flex flex-col gap-3">
          {isSubscribed ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1 rounded-md border border-success/30 bg-success-soft px-4 py-3 text-success">
                <span className="font-semibold">You're subscribed</span>
                {!isEvmPlan && (solanaSub.lookup.status === "active" || solanaSub.lookup.status === "past_due") && (
                  <span className="text-[13px]">
                    Next renewal {formatDateTimeUtc(new Date(Number(solanaSub.lookup.record.nextEpochTimestamp) * 1000).toISOString())}
                  </span>
                )}
              </div>
              <Button
                variant="outline"
                disabled={isPending}
                onClick={handleCancel}
                className="border-destructive/40 text-destructive hover:bg-destructive hover:text-white dark:hover:text-white transition-colors font-medium"
              >
                {isPending ? "Cancelling…" : "Cancel subscription"}
              </Button>
              <p className="text-[11px] text-muted-foreground text-center">
                Instant on-chain revocation · Non-custodial pull cancelled
              </p>
            </div>
          ) : (
            <SubscribeButton
              connected={isConnected}
              isSample={isSample}
              active={active}
              isOwner={isOwner}
              checking={isEvmPlan ? evmSub.lookup.status === "loading" : solanaSub.lookup.status === "loading"}
              pending={isPending}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
              onSubscribe={handleSubscribe}
            />
          )}

          <p className="text-xs leading-4.5 text-muted-foreground">
            You approve a recurring allowance once. Each renewal is pulled from your wallet; no funds are held in
            escrow, and you can cancel any time.
          </p>

          {isSample && (
            <p className="rounded-md border border-warning/40 bg-warning-soft px-3 py-2 text-[13px] text-warning">
              This is a sample plan. Subscribing needs a plan created on Devnet or Testnet.
            </p>
          )}

          {/* Error messages */}
          {!isEvmPlan && solanaSub.action.status === "error" && (
            <p role="alert" className="rounded-md border border-destructive/40 px-3 py-2 text-[13px] text-destructive">
              {solanaSub.action.message}
            </p>
          )}
          {isEvmPlan && evmSub.action.status === "error" && (
            <p role="alert" className="rounded-md border border-destructive/40 px-3 py-2 text-[13px] text-destructive">
              {evmSub.action.error}
            </p>
          )}

          {/* Success messages */}
          {!isEvmPlan && solanaSub.action.status === "done" && (
            <p role="status" className="text-xs text-muted-foreground">
              {solanaSub.action.kind === "cancel" && "Subscription cancelled; rent refunded to your wallet. "}
              <a
                href={explorerUrl("tx", solanaSub.action.signature)}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1 font-medium"
              >
                View transaction ↗
              </a>
            </p>
          )}
          {isEvmPlan && evmSub.action.status === "success" && evmSub.action.signature && (
            <p role="status" className="text-xs text-muted-foreground">
              <a
                href={`${evmSub.deployment.blockExplorer}/tx/${evmSub.action.signature}`}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1 font-medium"
              >
                View EVM transaction ↗
              </a>
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SubscribeButton(props: {
  connected: boolean;
  isSample: boolean;
  active: boolean;
  isOwner: boolean;
  checking: boolean;
  pending: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onSubscribe: () => void;
}) {
  if (!props.connected) {
    return (
      <Button size="lg" onClick={props.onConnect}>
        Connect wallet to subscribe
      </Button>
    );
  }
  if (!props.active) {
    return (
      <Button size="lg" disabled>
        This plan is not accepting subscribers
      </Button>
    );
  }
  if (props.isOwner) {
    return (
      <Button
        size="lg"
        variant="secondary"
        className="w-full font-medium border border-border/80 bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground shadow-xs"
        onClick={props.onDisconnect}
      >
        Disconnect wallet to switch
      </Button>
    );
  }
  return (
    <Button size="lg" disabled={props.isSample || props.checking || props.pending} onClick={props.onSubscribe}>
      {props.pending ? "Confirm in your wallet…" : props.checking ? "Checking subscription…" : "1-Click Subscribe"}
    </Button>
  );
}
