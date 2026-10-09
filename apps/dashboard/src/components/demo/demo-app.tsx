"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Check, Lock, LockOpen } from "lucide-react";
import { WalletButton } from "@/components/wallet-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useSubscription } from "@/hooks/use-subscription";
import { createClient, fetchPlan, parseAddress } from "@/lib/chain/accounts";
import { DEMO_PLAN_ADDRESS } from "@/lib/chain/config";
import { formatUsdc } from "@/lib/chain/derive";
import { intervalUnit } from "@/lib/types";

const FEATURES = [
  "Unlimited prompt optimizations",
  "Structured output templates",
  "Cancel any time, rent returned to your wallet",
];

const OPTIMIZED = [
  { label: "Role", text: "You are a senior product copywriter." },
  { label: "Task", text: "Write a product description for a note-taking app aimed at busy professionals." },
  { label: "Constraints", text: "80–100 words, plain language, one concrete benefit per sentence, no superlatives." },
  { label: "Output", text: "A single paragraph followed by three short feature bullets." },
];

const MOCK_TERMS = { price: "29.00", unit: "30 days" };

interface Gate {
  onChain: boolean;
  subscribed: boolean;
  busy: boolean;
  subscribeLabel: string;
  error: string | null;
  onSubscribe: () => void;
  onReset: () => void;
  resetLabel: string;
}

/** Plan terms for the on-chain demo plan, so the pricing card matches the chain. */
function usePlanTerms(address: string | null) {
  const { connection } = useConnection();
  const [terms, setTerms] = useState<{ key: string; price: string; unit: string } | null>(null);

  useEffect(() => {
    const plan = address ? parseAddress(address) : null;
    if (!address || !plan) return;
    let cancelled = false;
    fetchPlan(createClient(connection), plan).then(
      (account) => {
        if (!cancelled && account) {
          setTerms({ key: address, price: formatUsdc(account.amount), unit: intervalUnit(Number(account.intervalSeconds)) });
        }
      },
      (error: unknown) => console.error("[TidePay] Failed to load demo plan:", error),
    );
    return () => {
      cancelled = true;
    };
  }, [address, connection]);

  return terms?.key === address ? terms : null;
}

function useDemoGate(): Gate {
  const { connected } = useWallet();
  const { setVisible } = useWalletModal();
  const { lookup, action, subscribe, cancel } = useSubscription(DEMO_PLAN_ADDRESS);
  const [mockSubscribed, setMockSubscribed] = useState(false);

  return useMemo<Gate>(() => {
    if (!DEMO_PLAN_ADDRESS) {
      return {
        onChain: false,
        subscribed: mockSubscribed,
        busy: false,
        subscribeLabel: "Subscribe with TidePay",
        error: null,
        onSubscribe: () => setMockSubscribed(true),
        onReset: () => setMockSubscribed(false),
        resetLabel: "Reset demo",
      };
    }

    const pending = action.status === "pending";
    return {
      onChain: true,
      subscribed: lookup.status === "active",
      busy: pending || lookup.status === "loading",
      subscribeLabel: !connected
        ? "Connect wallet to subscribe"
        : pending
          ? "Confirm in your wallet…"
          : lookup.status === "loading"
            ? "Checking subscription…"
            : lookup.status === "past_due"
              ? "Renewal overdue: top up USDC"
              : "Subscribe with TidePay",
      error: action.status === "error" ? action.message : null,
      onSubscribe: () => (connected ? void subscribe() : setVisible(true)),
      onReset: () => void cancel(),
      resetLabel: pending && action.kind === "cancel" ? "Cancelling…" : "Cancel subscription",
    };
  }, [action, cancel, connected, lookup.status, mockSubscribed, setVisible, subscribe]);
}

export function DemoApp() {
  const gate = useDemoGate();
  const terms = usePlanTerms(DEMO_PLAN_ADDRESS) ?? MOCK_TERMS;
  const { subscribed } = gate;

  return (
    <div className="theme-demo min-h-dvh bg-background text-foreground">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-card px-4 py-3.5 md:px-10">
        <div className="flex items-center gap-2.5">
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
            <rect width="26" height="26" rx="6" fill="#14171c" />
            <path d="M7 19 13 7l6 12M9.6 15h6.8" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-[17px] font-bold tracking-tight">PromptPilot AI</span>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground hover:underline">
            Back to merchant console
          </Link>
          <Badge variant={subscribed ? "success" : "outline"} className="h-8 items-center px-3 text-[13px] font-semibold">
            {subscribed ? "Pro plan active" : "Free tier"}
          </Badge>
          {gate.onChain && <WalletButton />}
        </div>
      </header>

      <main id="main-content" className="flex flex-wrap items-start gap-6 px-4 py-8 md:px-10 md:py-10">
        <Card className="min-w-0 flex-[999_1_520px]">
          <CardContent className="flex flex-col gap-5 p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-[22px] font-bold leading-[30px] tracking-tight">Prompt Optimizer</h1>
                <p className="text-muted-foreground">Rewrite a rough prompt into a structured one.</p>
              </div>
              <Badge variant={subscribed ? "success" : "warning"} className="h-8 items-center gap-2 px-3 text-[13px] font-semibold">
                {subscribed ? <LockOpen className="size-3.5" /> : <Lock className="size-3.5" />}
                {subscribed ? "Unlocked" : "Locked (Requires Subscription)"}
              </Badge>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="rough" className="font-semibold">
                Rough prompt
              </Label>
              <textarea
                id="rough"
                rows={4}
                disabled={!subscribed}
                defaultValue="write a product description for a note taking app"
                className="w-full resize-y rounded-md border border-input bg-background p-3 text-[15px] leading-[22px] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:bg-muted disabled:text-muted-foreground"
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="text-sm font-semibold">Optimized prompt</div>
              {subscribed ? (
                <div className="flex flex-col gap-2.5 rounded-md border bg-card px-5 py-4" aria-live="polite">
                  {OPTIMIZED.map((line) => (
                    <div key={line.label}>
                      <span className="font-semibold">{line.label}.</span> {line.text}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-input bg-muted px-5 py-7 text-muted-foreground">
                  Subscribe to the Pro plan to run the optimizer. Output appears here as soon as your subscription is
                  confirmed on-chain.
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button disabled={!subscribed} className="bg-foreground text-background hover:bg-foreground/90">
                Optimize prompt
              </Button>
              {subscribed && (
                <Button variant="outline" disabled={gate.busy} onClick={gate.onReset}>
                  {gate.resetLabel}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0 flex-[1_1_320px]">
          <CardContent className="flex flex-col gap-[18px] p-6">
            <div className="flex items-baseline justify-between gap-3">
              <CardTitle className="text-[17px] font-bold">Pro plan</CardTitle>
              <span className="text-[22px] font-bold leading-7 tabular-nums">
                {terms.price} <span className="text-[13px] font-medium text-muted-foreground">USDC / {terms.unit}</span>
              </span>
            </div>

            <ul className="flex flex-col gap-2.5 text-foreground/80">
              {FEATURES.map((feature) => (
                <li key={feature} className="flex gap-2.5">
                  <Check className="mt-0.5 size-[18px] shrink-0 text-success" aria-hidden="true" />
                  {feature}
                </li>
              ))}
            </ul>

            {subscribed ? (
              <div className="flex flex-col gap-1 rounded-md border border-success/30 bg-success-soft px-4 py-3.5 text-success">
                <span className="font-semibold">Subscription confirmed</span>
                <span className="text-[13px] leading-[19px]">Renews every {terms.unit}. Cancel any time.</span>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                <Button size="lg" disabled={gate.busy} onClick={gate.onSubscribe}>
                  {gate.subscribeLabel}
                </Button>
                <p className="text-[13px] leading-[19px] text-muted-foreground">
                  You approve a recurring allowance once. Each renewal is pulled from your wallet; no funds are held by
                  PromptPilot or TidePay.
                </p>
              </div>
            )}

            {gate.error && (
              <p role="alert" className="rounded-md border border-destructive/40 px-3 py-2 text-[13px] text-destructive">
                {gate.error}
              </p>
            )}

            <div className="flex items-center justify-between gap-2 border-t pt-3.5 text-xs text-muted-foreground">
              <span>Payments by TidePay</span>
              <span className="font-mono">{gate.onChain ? "Devnet" : "Mock mode · Devnet"}</span>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
