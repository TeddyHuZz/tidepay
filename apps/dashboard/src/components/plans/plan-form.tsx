"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { createAssociatedTokenAccountIdempotentInstruction, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { CopyButton } from "@/components/copy-button";
import { useMerchantData } from "@/components/merchant-data-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSendTransaction } from "@/hooks/use-send-transaction";
import { createClient } from "@/lib/chain/accounts";
import {
  DEFAULT_CRANK_BOUNTY_USDC,
  PROTOCOL_FEE_BPS,
  USDC_MINT,
  blinkUrl,
  checkoutUrl,
  explorerUrl,
} from "@/lib/chain/config";
import { describeTransactionError } from "@/lib/chain/errors";
import { parseUsdc } from "@/lib/chain/derive";
import { INTERVALS, getInterval, type IntervalId } from "@/lib/types";
import { cn } from "@/lib/utils";

const PLAN_ID_PATTERN = /^[a-z0-9-]{1,32}$/;
const ZERO_PATTERN = /^0*(\.0*)?$/;

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; signature: string }
  | { status: "error"; message: string };

/** Keeps typed input valid as a plan ID without fighting the cursor. */
function toPlanId(value: string) {
  return value
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 32);
}

function parseBounty(value: string): bigint | null {
  return ZERO_PATTERN.test(value.trim()) && value.trim() !== "" ? BigInt(0) : parseUsdc(value);
}

export function PlanForm() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const { refresh } = useMerchantData();
  const { buildTransaction, send } = useSendTransaction();
  const client = useMemo(() => createClient(connection), [connection]);

  const [planId, setPlanId] = useState("promptpilot-pro");
  const [price, setPrice] = useState("29.00");
  const [bounty, setBounty] = useState(DEFAULT_CRANK_BOUNTY_USDC);
  const [intervalId, setIntervalId] = useState<IntervalId>("monthly");
  const [submit, setSubmit] = useState<SubmitState>({ status: "idle" });

  const interval = getInterval(intervalId);
  const planIdValid = PLAN_ID_PATTERN.test(planId);
  const amount = parseUsdc(price);
  const bountyAmount = parseBounty(bounty);
  const bountyValid = bountyAmount !== null && amount !== null && bountyAmount < amount;
  const formValid = planIdValid && amount !== null && bountyValid;

  const planAddress = useMemo(
    () => (publicKey && planIdValid ? client.findMerchantPlanPda(publicKey, planId)[0].toBase58() : null),
    [client, publicKey, planId, planIdValid],
  );

  async function createPlan() {
    if (!publicKey || !formValid || !planAddress || amount === null || bountyAmount === null) return;
    setSubmit({ status: "submitting" });
    try {
      const planPda = client.findMerchantPlanPda(publicKey, planId)[0];
      if (await connection.getAccountInfo(planPda)) {
        setSubmit({ status: "error", message: "You already have a plan with this ID. Choose another ID." });
        return;
      }

      const merchantTokenAccount = getAssociatedTokenAddressSync(USDC_MINT, publicKey);
      const { instruction } = await client.buildInitializePlanInstruction({
        merchant: publicKey,
        planId,
        amount,
        intervalSeconds: BigInt(interval.seconds),
        protocolFeeBps: PROTOCOL_FEE_BPS,
        crankBountyAmount: bountyAmount,
        tokenMint: USDC_MINT,
        merchantTokenAccount,
      });

      const tx = await buildTransaction(publicKey, [
        // Payments land in the merchant's USDC account; create it if missing.
        createAssociatedTokenAccountIdempotentInstruction(publicKey, merchantTokenAccount, publicKey, USDC_MINT),
        instruction,
      ]);
      const signature = await send(tx);
      setSubmit({ status: "success", signature });
      refresh();
    } catch (error) {
      console.error("[TidePay] createPlan failed:", error);
      setSubmit({ status: "error", message: describeTransactionError(error) });
    }
  }

  const created = submit.status === "success";

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
            <Label htmlFor="plan-id">Plan ID</Label>
            <Input
              id="plan-id"
              className="font-mono"
              value={planId}
              maxLength={32}
              onChange={(e) => setPlanId(toPlanId(e.target.value))}
              aria-invalid={!planIdValid}
              aria-describedby="plan-id-hint"
            />
            <p id="plan-id-hint" className={cn("text-xs", planIdValid ? "text-muted-foreground" : "text-destructive")}>
              Shown to subscribers. Lowercase letters, numbers and hyphens, up to 32 characters.
            </p>
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
                aria-invalid={amount === null}
                aria-describedby="plan-price-hint"
              />
              <p id="plan-price-hint" className={cn("text-xs", amount !== null ? "text-muted-foreground" : "text-destructive")}>
                {amount !== null ? "Up to 6 decimal places." : "Enter an amount greater than 0."}
              </p>
            </div>
            <div className="flex min-w-[200px] flex-1 flex-col gap-2">
              <Label htmlFor="plan-mint">Accepted mint</Label>
              <Input id="plan-mint" value="USDC (Devnet)" readOnly />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="plan-bounty">Keeper reward per renewal (USDC)</Label>
            <Input
              id="plan-bounty"
              inputMode="decimal"
              className="font-mono tabular-nums"
              value={bounty}
              onChange={(e) => setBounty(e.target.value)}
              aria-invalid={!bountyValid}
              aria-describedby="plan-bounty-hint"
            />
            <p id="plan-bounty-hint" className={cn("text-xs", bountyValid ? "text-muted-foreground" : "text-destructive")}>
              Paid to the keeper that settles each renewal, out of the price. Must be less than the price.
            </p>
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
                <Link href="/plans">{created ? "Back to plans" : "Cancel"}</Link>
              </Button>
              <Button
                disabled={!publicKey || !formValid || submit.status === "submitting" || created}
                onClick={() => void createPlan()}
              >
                {submit.status === "submitting" ? "Creating plan…" : "Create plan on Devnet"}
              </Button>
            </div>
            {!publicKey && (
              <p className="text-right text-xs text-muted-foreground">Connect a wallet to create a plan.</p>
            )}
            {submit.status === "error" && (
              <p role="alert" className="rounded-md border border-destructive/40 px-3 py-2 text-[13px] text-destructive">
                {submit.message}
              </p>
            )}
            {submit.status === "success" && (
              <p role="status" className="rounded-md border border-success/30 bg-success-soft px-3 py-2 text-[13px] text-success">
                Plan created.{" "}
                <a href={explorerUrl("tx", submit.signature)} target="_blank" rel="noreferrer" className="underline">
                  View transaction
                </a>
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="min-w-0 flex-[1_1_420px]">
        <CardContent className="flex flex-col gap-5 p-6">
          <div>
            <CardTitle className="text-base">{created ? "Share your plan" : "Share links"}</CardTitle>
            <CardDescription className="mt-1">
              {created
                ? "Your plan is live on Devnet. Share any of these with subscribers."
                : "Derived from your wallet and plan ID. They work once the plan is created."}
            </CardDescription>
          </div>

          <div className="flex flex-col gap-2 rounded-md border bg-background p-4">
            <div className="text-[13px] text-muted-foreground">Terms</div>
            <div className="text-lg font-semibold leading-[26px] tabular-nums">
              {amount !== null ? price.trim() : "0.00"} USDC every {interval.unit}
            </div>
          </div>

          {planAddress ? (
            <>
              <OutputField label="Blink URL" value={blinkUrl(planAddress)} copyLabel="Copy Blink URL" />
              <OutputField label="Checkout link" value={checkoutUrl(planAddress)} copyLabel="Copy checkout link" />
              <OutputField
                label="Embed snippet"
                value={`<iframe src="${checkoutUrl(planAddress)}" width="420" height="520"></iframe>`}
                copyLabel="Copy embed snippet"
              />
              <OutputField label="Plan PDA" value={planAddress} copyLabel="Copy plan address" />
            </>
          ) : (
            <p className="rounded-md border border-dashed border-input bg-background px-3 py-2.5 text-sm text-muted-foreground">
              Connect your wallet and enter a valid plan ID to see the plan address and share links.
            </p>
          )}
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
