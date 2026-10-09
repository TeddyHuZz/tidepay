"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";

interface CheckoutCardProps {
  name: string;
  priceUsdc: string;
  intervalUnit: string;
  isDemo: boolean;
}

export function CheckoutCard({ name, priceUsdc, intervalUnit, isDemo }: CheckoutCardProps) {
  const { connected } = useWallet();
  const { setVisible } = useWalletModal();
  const [clicked, setClicked] = useState(false);

  const rows = [
    { label: "Billed every", value: intervalUnit },
    { label: "Token", value: "USDC (Devnet)" },
    { label: "First charge", value: "Today" },
  ];

  return (
    <Card className="w-full max-w-md">
      <CardContent className="flex flex-col gap-6 p-6">
        <div>
          <CardTitle className="text-lg">{name}</CardTitle>
          <CardDescription className="mt-1">Recurring subscription, paid in USDC.</CardDescription>
        </div>

        <div className="text-3xl font-semibold leading-9 tracking-tight tabular-nums">
          {priceUsdc} <span className="text-sm font-medium text-muted-foreground">USDC / {intervalUnit}</span>
        </div>

        <dl className="flex flex-col">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-3 border-t py-2.5 text-sm">
              <dt className="text-muted-foreground">{row.label}</dt>
              <dd className="font-medium">{row.value}</dd>
            </div>
          ))}
        </dl>

        {isDemo && (
          <p className="rounded-md border border-warning/40 bg-warning-soft px-3 py-2 text-[13px] text-warning">
            Demo plan: renews every 60 seconds on Devnet.
          </p>
        )}

        <div className="flex flex-col gap-3">
          <Button size="lg" onClick={() => (connected ? setClicked(true) : setVisible(true))}>
            {connected ? "1-Click Subscribe" : "Connect wallet to subscribe"}
          </Button>
          <p className="text-xs leading-[18px] text-muted-foreground">
            You approve a recurring allowance once. Each renewal is pulled from your wallet; no funds are held in
            escrow, and you can cancel any time.
          </p>
          {clicked && (
            <p role="status" className="rounded-md border border-warning/40 bg-warning-soft px-3 py-2 text-[13px] text-warning">
              Transaction building is not connected yet. This will call subscribe() from @tidepay/sdk.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
