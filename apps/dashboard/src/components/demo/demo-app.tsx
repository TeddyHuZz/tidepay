"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Lock, LockOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

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

export function DemoApp() {
  // Mock gate. Replace with an on-chain subscription check from @tidepay/sdk;
  // the UI only needs a boolean.
  const [subscribed, setSubscribed] = useState(false);

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
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground hover:underline">
            Back to merchant console
          </Link>
          <Badge variant={subscribed ? "success" : "outline"} className="h-8 items-center px-3 text-[13px] font-semibold">
            {subscribed ? "Pro plan active" : "Free tier"}
          </Badge>
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
                <Button variant="outline" onClick={() => setSubscribed(false)}>
                  Reset demo
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
                29.00 <span className="text-[13px] font-medium text-muted-foreground">USDC / 30 days</span>
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
                <span className="text-[13px] leading-[19px]">Next renewal in 30 days. Manage or cancel from your wallet.</span>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                <Button size="lg" onClick={() => setSubscribed(true)}>
                  Subscribe with TidePay
                </Button>
                <p className="text-[13px] leading-[19px] text-muted-foreground">
                  You approve a recurring allowance once. Each renewal is pulled from your wallet; no funds are held by
                  PromptPilot or TidePay.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 border-t pt-3.5 text-xs text-muted-foreground">
              <span>Payments by TidePay</span>
              <span className="font-mono">Mock mode · Devnet</span>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
