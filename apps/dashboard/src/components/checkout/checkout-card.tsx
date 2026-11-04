"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Button } from "@/components/ui/button";
import { CheckoutShell } from "@/components/checkout/checkout-shell";
import { useSubscription } from "@/hooks/use-subscription";
import { explorerUrl } from "@/lib/chain/config";
import { formatDateTimeUtc } from "@/lib/format";

interface CheckoutCardProps {
  planAddress: string;
  name: string;
  priceUsdc: string;
  intervalSeconds: number;
  active: boolean;
  isSample: boolean;
  merchant?: string;
}

export function CheckoutCard({ planAddress, name, priceUsdc, intervalSeconds, active, isSample, merchant }: CheckoutCardProps) {
  const { connected, publicKey, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const { lookup, action, subscribe, cancel } = useSubscription(isSample ? null : planAddress);

  const pending = action.status === "pending";
  const subscribed = lookup.status === "active" || lookup.status === "past_due";
  const isOwner = Boolean(connected && publicKey && merchant && publicKey.toBase58() === merchant);

  const handleDisconnect = async () => {
    try {
      await disconnect();
    } catch (err) {
      console.error("[TidePay] Disconnect error:", err);
    }
  };

  const ownerNotice = isOwner ? (
    <p className="rounded-md border border-warning/40 bg-warning-soft px-3 py-2 text-[13px] text-warning">
      You are currently connected as the merchant of this plan. To test subscribing, please switch to a separate subscriber wallet in your wallet extension.
    </p>
  ) : null;

  const actions = subscribed ? (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1 rounded-md border border-success/30 bg-success-soft px-4 py-3 text-success">
        <span className="font-semibold">
          {lookup.status === "past_due" ? "Subscribed, renewal overdue" : "You're subscribed"}
        </span>
        <span className="text-[13px]">
          Next renewal {formatDateTimeUtc(new Date(Number(lookup.record.nextEpochTimestamp) * 1000).toISOString())}
        </span>
      </div>
      <Button
        variant="outline"
        disabled={pending}
        onClick={() => void cancel()}
        className="border-destructive/40 text-destructive hover:bg-destructive hover:text-white dark:hover:text-white transition-colors font-medium"
      >
        {pending && action.kind === "cancel" ? "Cancelling…" : "Cancel subscription"}
      </Button>
      <p className="text-[11px] text-muted-foreground text-center">
        Instant on-chain revocation · Returns ~0.0015 SOL rent to your wallet
      </p>
    </div>
  ) : (
    <SubscribeButton
      connected={connected}
      isSample={isSample}
      active={active}
      isOwner={isOwner}
      checking={lookup.status === "loading"}
      pending={pending}
      onConnect={() => setVisible(true)}
      onDisconnect={handleDisconnect}
      onSubscribe={() => void subscribe()}
    />
  );

  const footer = (
    <>
      {isSample && (
        <p className="rounded-md border border-warning/40 bg-warning-soft px-3 py-2 text-[13px] text-warning">
          This is a sample plan. Subscribing needs a plan created on Devnet.
        </p>
      )}
      {action.status === "error" && (
        <p role="alert" className="rounded-md border border-destructive/40 px-3 py-2 text-[13px] text-destructive">
          {action.message}
        </p>
      )}
      {action.status === "done" && (
        <p role="status" className="text-xs text-muted-foreground">
          {action.kind === "cancel" && "Subscription cancelled; rent refunded to your wallet. "}
          <a
            href={explorerUrl("tx", action.signature)}
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-1 font-medium"
          >
            View transaction ↗
          </a>
        </p>
      )}
    </>
  );

  return (
    <CheckoutShell
      name={name}
      priceUsdc={priceUsdc}
      intervalSeconds={intervalSeconds}
      tokenLabel="USDC (Devnet)"
      ownerNotice={ownerNotice}
      actions={actions}
      explainer="You approve a recurring allowance once. Each renewal is pulled from your wallet; no funds are held in escrow, and you can cancel any time."
      footer={footer}
    />
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
