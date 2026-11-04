import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { intervalUnit } from "@/lib/types";

interface CheckoutShellProps {
  name: string;
  priceUsdc: string;
  intervalSeconds: number;
  /** Shown in the "Token" row, e.g. "USDC (Devnet)". */
  tokenLabel: string;
  /** Rows inserted between "Token" and "First charge". */
  extraRows?: { label: string; value: ReactNode }[];
  /** Warning shown above the actions (for example, "you are the merchant"). */
  ownerNotice?: ReactNode;
  /** The chain-specific buttons and their result. */
  actions: ReactNode;
  /** One-sentence explanation of how billing works on this chain. */
  explainer: string;
  /** Sample-plan, error and success notices shown below the explainer. */
  footer?: ReactNode;
}

/** Layout shared by the Solana and NEAR checkout cards, so both look identical. */
export function CheckoutShell({
  name,
  priceUsdc,
  intervalSeconds,
  tokenLabel,
  extraRows = [],
  ownerNotice,
  actions,
  explainer,
  footer,
}: CheckoutShellProps) {
  const unit = intervalUnit(intervalSeconds);
  const rows = [
    { label: "Billed every", value: unit as ReactNode },
    { label: "Token", value: tokenLabel },
    ...extraRows,
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

        {ownerNotice}

        <div className="flex flex-col gap-3">
          {actions}
          <p className="text-xs leading-4.5 text-muted-foreground">{explainer}</p>
          {footer}
        </div>
      </CardContent>
    </Card>
  );
}
