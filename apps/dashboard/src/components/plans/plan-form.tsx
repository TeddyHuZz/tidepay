"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PublicKey } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { createAssociatedTokenAccountIdempotentInstruction, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { ArrowLeft, Info } from "lucide-react";
import { CopyButton } from "@/components/copy-button";
import { useMerchantData } from "@/components/merchant-data-provider";
import { useToast } from "@/components/ui/toast";
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
import { INTERVALS, getInterval, intervalUnit, type IntervalId } from "@/lib/types";
import { cn } from "@/lib/utils";

const PLAN_ID_PATTERN = /^[a-z0-9-]{1,32}$/;

const UNIT_MULTIPLIERS = {
  minutes: 60,
  hours: 3_600,
  days: 86_400,
  months: 2_592_000,
  years: 31_536_000,
} as const;

type CustomUnit = keyof typeof UNIT_MULTIPLIERS;

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

export function PlanForm() {
  const router = useRouter();
  const { success: toastSuccess, error: toastError } = useToast();
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const { refresh } = useMerchantData();
  const { buildTransaction, send } = useSendTransaction();
  const client = useMemo(() => createClient(connection), [connection]);

  const [planId, setPlanId] = useState("");
  const [price, setPrice] = useState("");
  const [intervalId, setIntervalId] = useState<IntervalId>("monthly");
  const [customCount, setCustomCount] = useState("1");
  const [customUnit, setCustomUnit] = useState<CustomUnit>("days");
  const [submit, setSubmit] = useState<SubmitState>({ status: "idle" });

  const crankBountyAmount = parseUsdc(DEFAULT_CRANK_BOUNTY_USDC) ?? BigInt(50_000);
  const planIdValid = PLAN_ID_PATTERN.test(planId);
  const planIdError = planId !== "" && !planIdValid;
  const amount = parseUsdc(price);
  const priceTooLow = amount !== null && amount <= crankBountyAmount;
  const priceError = price !== "" && (amount === null || priceTooLow);

  const customNumber = parseInt(customCount, 10);
  const customCountValid = !isNaN(customNumber) && customNumber >= 1;
  const intervalSeconds =
    intervalId === "custom"
      ? (customCountValid ? customNumber * UNIT_MULTIPLIERS[customUnit] : 0)
      : getInterval(intervalId).seconds;

  const intervalValid = intervalSeconds >= 60;
  const formValid = planIdValid && amount !== null && !priceTooLow && intervalValid;
  const intervalPhrase = intervalUnit(intervalSeconds);

  const planAddress = useMemo(
    () => (publicKey && planIdValid ? client.findMerchantPlanPda(publicKey, planId)[0].toBase58() : null),
    [client, publicKey, planId, planIdValid],
  );

  async function createPlan() {
    if (!publicKey || !formValid || !planAddress || amount === null) return;
    setSubmit({ status: "submitting" });
    try {
      const planPda = client.findMerchantPlanPda(publicKey, planId)[0];
      if (await connection.getAccountInfo(planPda)) {
        const errorMsg = "You already have a plan with this ID. Choose another ID.";
        setSubmit({ status: "error", message: errorMsg });
        toastError("Plan ID conflict", errorMsg);
        return;
      }

      const merchantTokenAccount = getAssociatedTokenAddressSync(USDC_MINT, publicKey);
      const { instruction } = await client.buildInitializePlanInstruction({
        merchant: publicKey,
        planId,
        amount,
        intervalSeconds: BigInt(intervalSeconds),
        protocolFeeBps: PROTOCOL_FEE_BPS,
        crankBountyAmount,
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

      // Poll until the Solana RPC index confirms the account exists before redirecting
      for (let i = 0; i < 6; i++) {
        const info = await connection.getAccountInfo(new PublicKey(planAddress), "confirmed");
        if (info) break;
        await new Promise((r) => setTimeout(r, 400));
      }

      refresh();
      toastSuccess(`Plan "${planId}" created successfully!`, "Redirecting to plan analytics...");

      setTimeout(() => {
        router.push(`/plans/${encodeURIComponent(planId)}`);
      }, 1200);
    } catch (error) {
      console.error("[TidePay] createPlan failed:", error);
      const errMessage = describeTransactionError(error);
      setSubmit({ status: "error", message: errMessage });
      toastError("Failed to create plan", errMessage);
    }
  }

  const created = submit.status === "success";

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground hover:text-foreground -ml-2"
        >
          <Link href="/plans">
            <ArrowLeft className="size-4" />
            Back to plans
          </Link>
        </Button>
      </div>

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
              placeholder="promptpilot-pro"
              value={planId}
              maxLength={32}
              onChange={(e) => setPlanId(toPlanId(e.target.value))}
              aria-invalid={planIdError}
              aria-describedby="plan-id-hint"
            />
            <p id="plan-id-hint" className={cn("text-xs", planIdError ? "text-destructive" : "text-muted-foreground")}>
              Shown to subscribers. Lowercase letters, numbers and hyphens, up to 32 characters.
            </p>
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="flex min-w-50 flex-1 flex-col gap-2">
              <Label htmlFor="plan-price">Price (USDC)</Label>
              <Input
                id="plan-price"
                inputMode="decimal"
                className="font-mono tabular-nums"
                placeholder="29.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                aria-invalid={priceError}
                aria-describedby="plan-price-hint"
              />
              <p id="plan-price-hint" className={cn("text-xs", priceError ? "text-destructive" : "text-muted-foreground")}>
                {priceTooLow
                  ? `Price must be greater than the ${DEFAULT_CRANK_BOUNTY_USDC} USDC renewal fee.`
                  : priceError
                    ? "Enter an amount greater than 0."
                    : "Up to 6 decimal places."}
              </p>
            </div>
            <div className="flex min-w-50 flex-1 flex-col gap-2">
              <Label htmlFor="plan-mint">Accepted mint</Label>
              <Input id="plan-mint" value="USDC (Devnet)" readOnly />
            </div>
          </div>

          {/* Network Renewal Fee Callout */}
          <div className="flex flex-col gap-2 rounded-lg border border-border/80 bg-accent/40 p-4">
            <div className="flex items-center gap-2">
              <Info className="size-4 shrink-0 text-primary" aria-hidden="true" />
              <span className="text-sm font-medium text-foreground">Network Renewal Fee</span>
              <span className="ml-auto font-mono text-xs font-semibold text-primary">{DEFAULT_CRANK_BOUNTY_USDC} USDC</span>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              A fixed {DEFAULT_CRANK_BOUNTY_USDC} USDC network fee is collected per renewal cycle to incentivize decentralized keeper cranks and cover on-chain Solana gas fees.
            </p>
          </div>

          <fieldset className="flex min-w-0 flex-col gap-3 border-0 p-0">
            <legend className="mb-1 text-sm font-medium">Billing interval</legend>
            <div role="group" aria-label="Billing interval" className="flex flex-wrap gap-2">
              {INTERVALS.map((option) => {
                const selected = option.id === intervalId;
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setIntervalId(option.id as IntervalId)}
                    className={cn(
                      "h-11 min-w-24 flex-1 rounded-md border px-3.5 text-sm font-medium outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring cursor-pointer",
                      selected
                        ? "border-primary bg-success-soft text-success"
                        : "border-input bg-background text-foreground/80 hover:bg-accent",
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
              <button
                type="button"
                aria-pressed={intervalId === "custom"}
                onClick={() => setIntervalId("custom")}
                className={cn(
                  "h-11 min-w-24 flex-1 rounded-md border px-3.5 text-sm font-medium outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring cursor-pointer",
                  intervalId === "custom"
                    ? "border-primary bg-success-soft text-success"
                    : "border-input bg-background text-foreground/80 hover:bg-accent",
                )}
              >
                Custom
              </button>
            </div>

            {intervalId === "custom" && (
              <div className="flex flex-col gap-2 rounded-lg border border-input bg-accent/20 p-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-24">
                    <Input
                      id="custom-interval-count"
                      type="number"
                      min={1}
                      value={customCount}
                      onChange={(e) => setCustomCount(e.target.value)}
                      className="h-11 text-center font-mono"
                      aria-label="Interval count"
                    />
                  </div>
                  <div className="flex-1">
                    <select
                      id="custom-interval-unit"
                      value={customUnit}
                      onChange={(e) => setCustomUnit(e.target.value as CustomUnit)}
                      className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring cursor-pointer"
                      aria-label="Interval unit"
                    >
                      <option value="minutes">Minute(s)</option>
                      <option value="hours">Hour(s)</option>
                      <option value="days">Day(s)</option>
                      <option value="months">Month(s) (30 days)</option>
                      <option value="years">Year(s) (365 days)</option>
                    </select>
                  </div>
                </div>
                {!intervalValid && (
                  <p className="text-xs text-destructive">
                    Custom interval must be at least 1 minute (60 seconds).
                  </p>
                )}
              </div>
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

          <div className="flex flex-col gap-2.5 rounded-md border bg-background p-4">
            <div className="text-[13px] text-muted-foreground">Terms</div>
            <div className="text-lg font-semibold leading-6.5 tabular-nums">
              {amount !== null && !priceError ? price.trim() : "0.00"} USDC every {intervalPhrase}
            </div>
            {amount !== null && !priceError && (
              <div className="flex items-center justify-between border-t border-border/60 pt-2 text-xs text-muted-foreground">
                <span>Net payout to merchant</span>
                <span className="font-mono font-medium text-foreground">
                  {(Number(price) - Number(DEFAULT_CRANK_BOUNTY_USDC)).toFixed(2)} USDC / cycle
                </span>
              </div>
            )}
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
  </div>
);
}

function OutputField({ label, value, copyLabel }: { label: string; value: string; copyLabel: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-sm font-medium">{label}</div>
      <div className="flex items-start gap-2">
        <code className="min-w-0 flex-1 break-all rounded-md border bg-background px-3 py-2.5 font-mono text-xs leading-4.5 text-foreground/80">
          {value}
        </code>
        <CopyButton value={value} label={copyLabel} />
      </div>
    </div>
  );
}
