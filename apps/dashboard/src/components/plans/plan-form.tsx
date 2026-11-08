"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PublicKey } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  NATIVE_MINT,
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { Check } from "lucide-react";
import { CopyButton } from "@/components/copy-button";
import { useMerchantData } from "@/components/merchant-data-provider";
import { useProject } from "@/components/project-context";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSendTransaction } from "@/hooks/use-send-transaction";
import { createClient } from "@/lib/chain/accounts";
import {
  DEFAULT_CRANK_BOUNTY_USDC,
  PROTOCOL_FEE_BPS,
  USDC_DECIMALS,
  USDC_MINT,
  blinkUrl,
  checkoutUrl,
  explorerUrl,
} from "@/lib/chain/config";
import { describeTransactionError } from "@/lib/chain/errors";
import { formatUsdc, parseUsdc } from "@/lib/chain/derive";
import { useNearMerchant } from "@/hooks/use-near-merchant";
import { NEAR_CONTRACT_ID, NEAR_PROTOCOL_FEE_BPS, nearExplorerUrl } from "@/lib/near/config";
import { describeNearError } from "@/lib/near/errors";
import { toNearPlanId } from "@/lib/near/ids";
import { waitFor } from "@/lib/near/wait";
import { buildNearCreatePlanParams, nearNetPayout, nearPriceTooLow } from "@/lib/near/plan-args";
import { INTERVALS, getInterval, intervalUnit, type IntervalId } from "@/lib/types";
import { cn } from "@/lib/utils";

const PLAN_ID_PATTERN = /^[a-z0-9-]{1,32}$/;

/** Mints a plan can bill in. SOL is billed as wrapped SOL (delegation requires an SPL token account). */
const TOKENS = {
  USDC: {
    symbol: "USDC",
    label: "USDC (Devnet)",
    mint: USDC_MINT,
    decimals: USDC_DECIMALS,
    renewalFee: DEFAULT_CRANK_BOUNTY_USDC,
    pricePlaceholder: "29.00",
    displayDecimals: 2,
  },
  SOL: {
    symbol: "SOL",
    label: "SOL (wrapped)",
    mint: NATIVE_MINT,
    decimals: 9,
    renewalFee: "0.0005",
    pricePlaceholder: "0.25",
    displayDecimals: 4,
  },
} as const;

type TokenId = keyof typeof TOKENS;

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

export function PlanForm({
  initialNetwork = "solana",
  preselected = false,
}: {
  initialNetwork?: "solana" | "near";
  preselected?: boolean;
}) {
  const router = useRouter();
  const { success: toastSuccess, error: toastError } = useToast();
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const { refresh } = useMerchantData();
  const { addPlanToActiveProject } = useProject();
  const { buildTransaction, send } = useSendTransaction();
  const client = useMemo(() => createClient(connection), [connection]);

  const [planId, setPlanId] = useState("");
  const [price, setPrice] = useState("");
  const [intervalId, setIntervalId] = useState<IntervalId>("monthly");
  const [customCount, setCustomCount] = useState("1");
  const [customUnit, setCustomUnit] = useState<CustomUnit>("days");
  const [submit, setSubmit] = useState<SubmitState>({ status: "idle" });
  const [tokenId, setTokenId] = useState<TokenId>("USDC");
  const [step, setStep] = useState(preselected ? 2 : 1);
  const [network, setNetwork] = useState<"solana" | "near">(initialNetwork);
  const { prepare, status: nearStatus, accountId: nearAccountId } = useNearMerchant();

  const isNear = network === "near";
  const token = TOKENS[isNear ? "USDC" : tokenId];
  const crankBountyAmount = parseUsdc(token.renewalFee, token.decimals) ?? BigInt(0);
  const planIdValid = PLAN_ID_PATTERN.test(planId);
  const planIdError = planId !== "" && !planIdValid;
  const amount = parseUsdc(price, token.decimals);
  const priceTooLow = amount !== null && (isNear ? nearPriceTooLow(amount, crankBountyAmount) : amount <= crankBountyAmount);
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

  function selectNetwork(next: "solana" | "near") {
    setNetwork(next);
    if (next === "near") setTokenId("USDC"); // the NEAR demo token is the only option
    setSubmit({ status: "idle" });
  }

  async function createNearPlan() {
    if (!formValid || amount === null) return;
    setSubmit({ status: "submitting" });
    try {
      const client = await prepare(); // derive the key, fund the account, register it on the token
      if (!client) throw new Error("Could not set up your NEAR account. Please try again.");
      await client.createPlan(buildNearCreatePlanParams({ planId, amount, intervalSeconds }));
      setSubmit({ status: "success", signature: nearAccountId ?? "" });

      // Reads can lag the write by a moment; wait until the plan is visible before refreshing and redirecting.
      await waitFor(() => client.getPlan(planId), { attempts: 12, intervalMs: 400 });

      addPlanToActiveProject(toNearPlanId(planId));
      addPlanToActiveProject(planId);
      refresh();
      toastSuccess(`Plan "${planId}" created successfully!`, "Redirecting to plan analytics...");
      setTimeout(() => router.push(`/plans/${encodeURIComponent(toNearPlanId(planId))}`), 1200);
    } catch (error) {
      console.error("[TidePay] createNearPlan failed:", error);
      const message = describeNearError(error);
      setSubmit({ status: "error", message });
      toastError("Failed to create plan", message);
    }
  }

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

      const merchantTokenAccount = getAssociatedTokenAddressSync(token.mint, publicKey);
      const { instruction } = await client.buildInitializePlanInstruction({
        merchant: publicKey,
        planId,
        amount,
        intervalSeconds: BigInt(intervalSeconds),
        protocolFeeBps: PROTOCOL_FEE_BPS,
        crankBountyAmount,
        tokenMint: token.mint,
        merchantTokenAccount,
      });

      const tx = await buildTransaction(publicKey, [
        // Payments land in the merchant's token account; create it if missing.
        createAssociatedTokenAccountIdempotentInstruction(publicKey, merchantTokenAccount, publicKey, token.mint),
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

      addPlanToActiveProject(planId);
      addPlanToActiveProject(planAddress);
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
  const protocolBps = isNear ? NEAR_PROTOCOL_FEE_BPS : PROTOCOL_FEE_BPS;
  const priceNum = amount !== null && !priceError ? Number(price) : null;
  const protocolFee = priceNum === null ? null : (priceNum * protocolBps) / 10_000;
  const netPayout =
    priceNum === null
      ? null
      : isNear
        ? formatUsdc(nearNetPayout(amount!, crankBountyAmount))
        : (priceNum - Number(token.renewalFee)).toFixed(token.displayDecimals);
  const detailsValid = planIdValid && amount !== null && !priceTooLow;
  const networkLabel = isNear ? "NEAR Testnet" : "Solana Devnet";
  const optionClass = (selected: boolean) =>
    cn(
      "h-11 min-w-24 flex-1 rounded-xl border px-3.5 text-sm font-medium outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring cursor-pointer",
      selected
        ? "border-primary bg-success-soft text-success"
        : "border-input bg-background text-foreground/80 hover:bg-accent",
    );
  const selectClass =
    "h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring cursor-pointer";

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="flex min-w-0 flex-col gap-4">
        <StepCard
          n={1}
          title="Network"
          current={step}
          description={networkLabel}
          idleDescription="Choose where subscribers pay."
          onChange={created ? undefined : () => setStep(1)}
        >
          <div role="group" aria-label="Network" className="flex flex-wrap gap-2">
            {(
              [
                { id: "solana", label: "Solana Devnet" },
                { id: "near", label: "NEAR Testnet" },
              ] as const
            ).map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={option.id === network}
                onClick={() => selectNetwork(option.id)}
                className={optionClass(option.id === network)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {isNear
              ? "Subscribers prepay renewals into the TidePay contract and get the unused balance back when they cancel."
              : "Subscribers approve a one-time delegated allowance. Nothing is held in escrow."}
          </p>
          <Button className="self-start rounded-xl" onClick={() => setStep(2)}>
            Continue to plan details
          </Button>
        </StepCard>

        <StepCard
          n={2}
          title="Plan details"
          current={step}
          description={detailsValid ? `${planId} · ${price.trim()} ${token.symbol}` : undefined}
          idleDescription="Name your plan and set what subscribers pay."
          onChange={created ? undefined : () => setStep(2)}
        >
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
            <div className="flex min-w-40 flex-1 flex-col gap-2">
              <Label htmlFor="plan-price">Price ({token.symbol})</Label>
              <Input
                id="plan-price"
                inputMode="decimal"
                className="font-mono tabular-nums"
                placeholder={token.pricePlaceholder}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                aria-invalid={priceError}
                aria-describedby="plan-price-hint"
              />
              <p id="plan-price-hint" className={cn("text-xs", priceError ? "text-destructive" : "text-muted-foreground")}>
                {priceTooLow
                  ? isNear
                    ? "Price is too low to cover the protocol fee and the renewal fee."
                    : `Price must be greater than the ${token.renewalFee} ${token.symbol} renewal fee.`
                  : priceError
                    ? "Enter an amount greater than 0."
                    : `Up to ${token.decimals} decimal places.`}
              </p>
            </div>
            <div className="flex min-w-40 flex-1 flex-col gap-2">
              <Label htmlFor="plan-mint">Accepted token</Label>
              <select
                id="plan-mint"
                value={tokenId}
                onChange={(e) => setTokenId(e.target.value as TokenId)}
                className={selectClass}
              >
                {(Object.keys(TOKENS) as TokenId[])
                  .filter((id) => !isNear || id === "USDC")
                  .map((id) => (
                    <option key={id} value={id}>
                      {isNear ? "USDC (NEAR demo)" : TOKENS[id].label}
                    </option>
                  ))}
              </select>
            </div>
          </div>
          <Button className="self-start rounded-xl" disabled={!detailsValid} onClick={() => setStep(3)}>
            Continue to billing
          </Button>
        </StepCard>

        <StepCard
          n={3}
          title="Billing interval"
          current={step}
          description={intervalValid ? `Every ${intervalPhrase}` : undefined}
          idleDescription="Daily, weekly, monthly, yearly or custom."
          onChange={created ? undefined : () => setStep(3)}
        >
          <div role="group" aria-label="Billing interval" className="flex flex-wrap gap-2">
            {INTERVALS.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={option.id === intervalId}
                onClick={() => setIntervalId(option.id as IntervalId)}
                className={optionClass(option.id === intervalId)}
              >
                {option.label}
              </button>
            ))}
            <button
              type="button"
              aria-pressed={intervalId === "custom"}
              onClick={() => setIntervalId("custom")}
              className={optionClass(intervalId === "custom")}
            >
              Custom
            </button>
          </div>

          {intervalId === "custom" && (
            <div className="flex flex-col gap-2 rounded-xl border border-input bg-accent/20 p-3.5">
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
                    className={selectClass}
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
                <p className="text-xs text-destructive">Custom interval must be at least 1 minute (60 seconds).</p>
              )}
            </div>
          )}
          <Button className="self-start rounded-xl" disabled={!intervalValid} onClick={() => setStep(4)}>
            Continue to review
          </Button>
        </StepCard>

        <StepCard
          n={4}
          title="Review & create"
          current={step}
          idleDescription="Check terms and fees, then deploy."
        >
          <dl className="flex flex-col gap-2 rounded-xl border bg-background p-4 text-sm">
            {[
              ["Network", networkLabel],
              ["Plan ID", planId || "—"],
              ["Terms", `${price.trim() || "0.00"} ${token.symbol} every ${intervalPhrase}`],
              ["You receive per cycle", netPayout === null ? "—" : `${netPayout} ${token.symbol}`],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="truncate font-mono text-foreground">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              className="rounded-xl"
              disabled={!publicKey || !formValid || submit.status === "submitting" || created}
              onClick={() => void (isNear ? createNearPlan() : createPlan())}
            >
              {submit.status === "submitting"
                ? isNear && (nearStatus === "deriving" || nearStatus === "funding" || nearStatus === "registering")
                  ? { deriving: "Unlocking NEAR account…", funding: "Funding NEAR account…", registering: "Registering token…" }[nearStatus]
                  : "Creating plan…"
                : isNear
                  ? "Create plan on NEAR Testnet"
                  : "Create plan on Devnet"}
            </Button>
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/plans">{created ? "Back to plans" : "Cancel"}</Link>
            </Button>
          </div>
          {!publicKey && <p className="text-xs text-muted-foreground">Connect a wallet to create a plan.</p>}
          {submit.status === "error" && (
            <p role="alert" className="rounded-md border border-destructive/40 px-3 py-2 text-[13px] text-destructive">
              {submit.message}
            </p>
          )}
          {submit.status === "success" && (
            <p role="status" className="rounded-md border border-success/30 bg-success-soft px-3 py-2 text-[13px] text-success">
              Plan created.{" "}
              <a
                href={isNear ? nearExplorerUrl("address", submit.signature) : explorerUrl("tx", submit.signature)}
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                {isNear ? "View account" : "View transaction"}
              </a>
            </p>
          )}
        </StepCard>
      </div>

      <div className="flex min-w-0 flex-col gap-4">
        <Card className="p-5 sm:p-6">
          <div className="text-sm text-muted-foreground">Terms so far</div>
          <div className="mt-2 text-3xl font-bold tracking-tight tabular-nums">
            {priceNum === null ? "0.00" : price.trim()} {token.symbol}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            {step >= 3 && intervalValid ? `Every ${intervalPhrase}` : "Interval not chosen yet"}
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <CardTitle className="mb-3 text-lg font-bold">Fees per renewal</CardTitle>
          <div className="flex flex-col gap-2 text-sm">
            <Row k="Subscriber pays" v={priceNum === null ? "—" : `${price.trim()} ${token.symbol}`} />
            <Row k="Network renewal fee" v={`− ${token.renewalFee} ${token.symbol}`} />
            <Row k="Protocol fee" v={`${protocolBps / 100}%${protocolFee ? ` (− ${protocolFee.toFixed(token.displayDecimals)})` : ""}`} />
            <div className="mt-1 flex items-center justify-between border-t pt-3 font-semibold">
              <span>You receive (approx.)</span>
              <span className="font-mono tabular-nums text-primary">
                {netPayout === null ? "—" : `${netPayout} ${token.symbol}`}
              </span>
            </div>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            The renewal fee pays the keeper that settles each cycle{isNear ? " and NEAR gas" : ""}. Rough estimate, per cycle.
          </p>
        </Card>

        <Card className="p-5 sm:p-6">
          <CardTitle className="mb-1 text-lg font-bold">{created ? "Share your plan" : "Share links"}</CardTitle>
          {planIdValid && (isNear || planAddress) ? (
            <div className="mt-3 flex flex-col gap-4">
              {isNear ? (
                <>
                  <OutputField label="Checkout link" value={checkoutUrl(toNearPlanId(planId))} copyLabel="Copy checkout link" />
                  <OutputField
                    label="Embed snippet"
                    value={`<iframe src="${checkoutUrl(toNearPlanId(planId))}" width="420" height="520"></iframe>`}
                    copyLabel="Copy embed snippet"
                  />
                  <OutputField label="Contract" value={NEAR_CONTRACT_ID || "Set NEXT_PUBLIC_TIDEPAY_NEAR_CONTRACT"} copyLabel="Copy contract id" />
                </>
              ) : (
                <>
                  <OutputField label="Blink URL" value={blinkUrl(planAddress!)} copyLabel="Copy Blink URL" />
                  <OutputField label="Checkout link" value={checkoutUrl(planAddress!)} copyLabel="Copy checkout link" />
                  <OutputField
                    label="Embed snippet"
                    value={`<iframe src="${checkoutUrl(planAddress!)}" width="420" height="520"></iframe>`}
                    copyLabel="Copy embed snippet"
                  />
                  <OutputField label="Plan PDA" value={planAddress!} copyLabel="Copy plan address" />
                </>
              )}
              {!created && <p className="text-xs text-muted-foreground">Links work once the plan is created.</p>}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {isNear || publicKey ? "Available after you create the plan." : "Connect your wallet and enter a plan ID to preview links."}
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-mono tabular-nums text-foreground/90">{v}</span>
    </div>
  );
}

/** One step of the guided flow: expanded when current, a summary with "Change" once passed, muted until reached. */
function StepCard({
  n,
  title,
  current,
  description,
  idleDescription,
  onChange,
  children,
}: {
  n: number;
  title: string;
  current: number;
  description?: string;
  idleDescription: string;
  onChange?: () => void;
  children: React.ReactNode;
}) {
  const active = current === n;
  const done = current > n;
  return (
    <section
      aria-current={active ? "step" : undefined}
      className={cn(
        "rounded-2xl border bg-card p-5 transition-colors",
        active && "border-primary/70",
        !active && !done && "opacity-60",
      )}
    >
      <div className="flex items-start gap-4">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full border text-sm font-semibold",
            done ? "border-primary bg-primary text-primary-foreground" : active ? "border-primary text-primary" : "text-muted-foreground",
          )}
        >
          {done ? <Check className="size-5" aria-hidden="true" /> : n}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-bold leading-snug">{done || active ? `${n} · ${title}` : title}</h2>
              <p className="text-sm text-muted-foreground">{done && description ? description : idleDescription}</p>
            </div>
            {done && onChange && (
              <button type="button" onClick={onChange} className="shrink-0 text-sm font-medium text-primary hover:underline">
                Change
              </button>
            )}
          </div>
          {active && <div className="mt-5 flex flex-col gap-4">{children}</div>}
        </div>
      </div>
    </section>
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
