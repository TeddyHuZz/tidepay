"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { useSubscription } from "@/hooks/use-subscription";
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

export function CheckoutCard({ planAddress, name, priceUsdc, intervalSeconds, active, isSample, merchant }: CheckoutCardProps) {
  const { connected, publicKey, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const { lookup, action, subscribe, cancel } = useSubscription(isSample ? null : planAddress);

  const unit = intervalUnit(intervalSeconds);
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

  const rows = [
    { label: "Billed every", value: unit },
    { label: "Token", value: "USDC (Devnet)" },
    { label: "First charge", value: "Today, when you subscribe" },
  ];

  return (
    <Card className="w-full max-w-md">
      <CardContent className="flex flex-col gap-6 p-6">
        <div>
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
          {subscribed ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1 rounded-md border border-success/30 bg-success-soft px-4 py-3 text-success">
                <span className="font-semibold">
                  {lookup.status === "past_due" ? "Subscribed, renewal overdue" : "You're subscribed"}
                </span>
                <span className="text-[13px]">
                  Next renewal {formatDateTimeUtc(new Date(Number(lookup.record.nextEpochTimestamp) * 1000).toISOString())}
                </span>
              </div>
              <Button variant="outline" disabled={pending} onClick={() => void cancel()}>
                {pending && action.kind === "cancel" ? "Cancelling…" : "Cancel subscription"}
              </Button>
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
          )}

          <p className="text-xs leading-4.5 text-muted-foreground">
            You approve a recurring allowance once. Each renewal is pulled from your wallet; no funds are held in
            escrow, and you can cancel any time.
          </p>

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
