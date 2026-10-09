"use client";

import { useState } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { CopyButton } from "@/components/copy-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { slugify } from "@/lib/format";
import { INTERVALS, getInterval, type IntervalId } from "@/lib/types";
import { cn } from "@/lib/utils";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://[your-domain]";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://[your-api-domain]";
const PRICE_PATTERN = /^\d+(\.\d{1,6})?$/;

export function PlanForm() {
  const { connected } = useWallet();
  const [name, setName] = useState("PromptPilot Pro");
  const [price, setPrice] = useState("29.00");
  const [intervalId, setIntervalId] = useState<IntervalId>("monthly");
  const [submitted, setSubmitted] = useState(false);

  const interval = getInterval(intervalId);
  const priceValid = PRICE_PATTERN.test(price) && Number(price) > 0;
  const slug = slugify(name) || "your-plan";
  // The Action API identifies a plan by its on-chain address, known after creation.
  const actionUrl = `${API_URL}/api/actions/subscribe/[plan-address]`;
  const blinkUrl = `https://dial.to/?action=solana-action:${encodeURIComponent(actionUrl)}`;
  const embed = `<iframe src="${APP_URL}/checkout/${slug}" width="420" height="520"></iframe>`;
  const canSubmit = connected && priceValid && name.trim().length > 0;

  return (
    <div className="flex flex-wrap items-start gap-6">
      <Card className="min-w-0 flex-[1_1_420px]">
        <CardContent className="flex flex-col gap-6 p-6">
          <div>
            <CardTitle className="text-base">Plan details</CardTitle>
            <CardDescription className="mt-1">
              Subscribers approve a one-time delegated allowance. Nothing is held in escrow.
            </CardDescription>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="plan-name">Plan name</Label>
            <Input id="plan-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="flex min-w-[200px] flex-1 flex-col gap-2">
              <Label htmlFor="plan-price">Price (USDC)</Label>
              <Input
                id="plan-price"
                inputMode="decimal"
                className="font-mono tabular-nums"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                aria-invalid={!priceValid}
                aria-describedby="plan-price-hint"
              />
              <p id="plan-price-hint" className={cn("text-xs", priceValid ? "text-muted-foreground" : "text-destructive")}>
                {priceValid ? "Up to 6 decimal places." : "Enter an amount greater than 0."}
              </p>
            </div>
            <div className="flex min-w-[200px] flex-1 flex-col gap-2">
              <Label htmlFor="plan-mint">Accepted mint</Label>
              <Input id="plan-mint" value="USDC (Devnet)" readOnly />
            </div>
          </div>

          <fieldset className="flex min-w-0 flex-col gap-2 border-0 p-0">
            <legend className="mb-2 text-sm font-medium">Billing interval</legend>
            <div role="group" aria-label="Billing interval" className="flex flex-wrap gap-2">
              {INTERVALS.map((option) => {
                const selected = option.id === intervalId;
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setIntervalId(option.id)}
                    className={cn(
                      "h-11 min-w-[140px] flex-1 rounded-md border px-3.5 text-sm font-medium outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                      selected
                        ? "border-primary bg-success-soft text-success"
                        : "border-input bg-background text-foreground/80 hover:bg-accent",
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            {intervalId === "demo" && (
              <p className="mt-1 text-[13px] text-warning">
                Demo mode bills every 60 seconds on Devnet. Do not use it for production plans.
              </p>
            )}
          </fieldset>

          <div className="flex flex-col gap-3 border-t pt-4">
            <div className="flex flex-wrap items-center justify-end gap-3">
              <Button asChild variant="outline">
                <Link href="/plans">Cancel</Link>
              </Button>
              <Button disabled={!canSubmit} onClick={() => setSubmitted(true)}>
                Create plan on Devnet
              </Button>
            </div>
            {!connected && (
              <p className="text-right text-xs text-muted-foreground">Connect a wallet to create a plan.</p>
            )}
            {submitted && (
              <p role="status" className="rounded-md border border-warning/40 bg-warning-soft px-3 py-2 text-[13px] text-warning">
                Transaction building is not connected yet. This will call createPlan() from @tidepay/sdk.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="min-w-0 flex-[1_1_420px]">
        <CardContent className="flex flex-col gap-5 p-6">
          <div>
            <CardTitle className="text-base">Generated after confirmation</CardTitle>
            <CardDescription className="mt-1">
              These appear once the plan transaction is confirmed on-chain.
            </CardDescription>
          </div>

          <div className="flex flex-col gap-2 rounded-md border bg-background p-4">
            <div className="text-[13px] text-muted-foreground">Terms</div>
            <div className="text-lg font-semibold leading-[26px] tabular-nums">
              {priceValid ? price : "0.00"} USDC every {interval.unit}
            </div>
          </div>

          <OutputField label="Blink URL" value={blinkUrl} copyLabel="Copy Blink URL" />
          <OutputField label="Embed snippet" value={embed} copyLabel="Copy embed snippet" />

          <div className="flex flex-col gap-2">
            <div className="text-sm font-medium">Plan PDA</div>
            <div className="rounded-md border border-dashed border-input bg-background px-3 py-2.5 font-mono text-xs leading-[18px] text-muted-foreground">
              [PLAN PDA: derived from merchant wallet and plan ID]
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function OutputField({ label, value, copyLabel }: { label: string; value: string; copyLabel: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-sm font-medium">{label}</div>
      <div className="flex items-start gap-2">
        <code className="min-w-0 flex-1 break-all rounded-md border bg-background px-3 py-2.5 font-mono text-xs leading-[18px] text-foreground/80">
          {value}
        </code>
        <CopyButton value={value} label={copyLabel} />
      </div>
    </div>
  );
}
