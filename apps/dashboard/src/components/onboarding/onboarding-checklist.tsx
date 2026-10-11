"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Circle,
  Sparkles,
  ChevronDown,
  X,
  Plus,
  Share2,
  Cpu,
  BookOpen,
  ArrowRight,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { PlanSummary, SubscriberRow } from "@/lib/types";
import { isBlinkSharedLocally } from "./onboarding-state";

interface OnboardingChecklistProps {
  plans: PlanSummary[];
  subscribers: SubscriberRow[];
  totalSettlementsCount?: number;
  onOpenWalkthrough: () => void;
}

const STORAGE_DISMISSED_KEY = "tidepay_onboarding_dismissed";
const STORAGE_COLLAPSED_KEY = "tidepay_onboarding_collapsed";

export function OnboardingChecklist({
  plans,
  subscribers,
  totalSettlementsCount = 0,
  onOpenWalkthrough,
}: OnboardingChecklistProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isBlinkShared, setIsBlinkShared] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const dismissed = localStorage.getItem(STORAGE_DISMISSED_KEY);
    const collapsed = localStorage.getItem(STORAGE_COLLAPSED_KEY);
    if (dismissed === "true") setIsDismissed(true);
    if (collapsed === "true") setIsCollapsed(true);

    setIsBlinkShared(isBlinkSharedLocally());
    const handleBlinkShared = () => setIsBlinkShared(true);
    window.addEventListener("tidepay:blink-shared", handleBlinkShared);
    window.addEventListener("storage", handleBlinkShared);

    return () => {
      window.removeEventListener("tidepay:blink-shared", handleBlinkShared);
      window.removeEventListener("storage", handleBlinkShared);
    };
  }, []);

  if (!mounted || isDismissed) return null;

  // Milestone logic
  const hasConnectedWallet = true; // Gate ensures merchant is connected
  const hasCreatedPlan = plans.length > 0;
  const hasSharedBlink = isBlinkShared || subscribers.length > 0 || totalSettlementsCount > 0;
  const hasCrankSettlement = totalSettlementsCount > 0;

  const steps = [
    {
      id: "wallet",
      title: "Connect Merchant Wallet",
      description: "Connected to Solana Devnet via non-custodial pull authority.",
      completed: hasConnectedWallet,
      icon: Wallet,
      action: null,
    },
    {
      id: "plan",
      title: "Create Your First Subscription Plan",
      description: "Set price in USDC and billing interval (test down to 60s).",
      completed: hasCreatedPlan,
      icon: Plus,
      action: !hasCreatedPlan ? (
        <Button asChild size="sm" className="h-7 px-2.5 text-xs gap-1 bg-primary text-primary-foreground">
          <Link href="/plans/new">
            Create Plan
            <ArrowRight className="size-3" />
          </Link>
        </Button>
      ) : null,
    },
    {
      id: "distribution",
      title: "Distribute via Blinks & Checkout Link",
      description: "Share on X (Twitter), Telegram, or embed the checkout widget.",
      completed: hasSharedBlink,
      icon: Share2,
      action: hasCreatedPlan ? (
        <Button asChild variant="outline" size="sm" className="h-7 px-2.5 text-xs gap-1">
          <Link href={plans[0] ? `/plans/${encodeURIComponent(plans[0].name || plans[0].id)}` : "/plans"}>
            View Share Links
            <ArrowRight className="size-3" />
          </Link>
        </Button>
      ) : null,
    },
    {
      id: "crank",
      title: "Automated Renewal Settlements",
      description: "Keeper Crank workers continuously execute recurring epoch pulls on-chain.",
      completed: hasCrankSettlement,
      icon: Cpu,
      action: (
        <Button asChild variant="outline" size="sm" className="h-7 px-2.5 text-xs gap-1">
          <Link href="/developers">
            View Crank
            <ArrowRight className="size-3" />
          </Link>
        </Button>
      ),
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem(STORAGE_DISMISSED_KEY, "true");
  };

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem(STORAGE_COLLAPSED_KEY, String(next));
  };

  return (
    <Card className="relative overflow-hidden border-primary/20 bg-linear-to-br from-card via-card to-primary/5 p-4 sm:p-5 shadow-sm">
      {/* Decorative gradient glow */}
      <div className="absolute top-0 right-0 h-full w-48 bg-primary/5 blur-2xl pointer-events-none" />

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="size-4" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-foreground tracking-tight">Quickstart Guide: Getting Started</h2>
              <span className="text-[11px] font-mono font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                {completedCount}/{steps.length} completed
              </span>
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {progressPercent === 100
                ? "All set! Your TidePay subscription engine is live and settling on Solana."
                : "Follow these 4 simple steps to set up and distribute non-custodial subscriptions."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onOpenWalkthrough}
            className="h-8 gap-1.5 text-xs text-primary hover:bg-primary/10 cursor-pointer"
          >
            <BookOpen className="size-3.5" />
            <span>Interactive Tour</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={toggleCollapse}
            className="size-8 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
            aria-label={isCollapsed ? "Expand checklist" : "Collapse checklist"}
          >
            <ChevronDown className={cn("size-4 transition-transform duration-200", isCollapsed && "-rotate-90")} />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="size-8 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
            aria-label="Dismiss checklist"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-3.5 h-1.5 w-full rounded-full bg-accent/60 overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-500 rounded-full"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Step Items List */}
      {!isCollapsed && (
        <div className="mt-4 grid gap-2.5 sm:grid-cols-2 pt-1">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={step.id}
                className={cn(
                  "flex items-start justify-between gap-3 rounded-xl border p-3 transition-colors",
                  step.completed
                    ? "border-emerald-500/20 bg-emerald-500/5 text-foreground"
                    : "border-border/60 bg-background/50 hover:border-border text-foreground"
                )}
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="mt-0.5 shrink-0">
                    {step.completed ? (
                      <CheckCircle2 className="size-4.5 text-emerald-500" />
                    ) : (
                      <Circle className="size-4.5 text-muted-foreground/60" />
                    )}
                  </div>
                  <div className="flex flex-col min-w-0 gap-0.5">
                    <span className={cn("text-xs font-semibold leading-tight", step.completed && "text-foreground")}>
                      {idx + 1}. {step.title}
                    </span>
                    <span className="text-[11px] text-muted-foreground leading-normal line-clamp-2">
                      {step.description}
                    </span>
                  </div>
                </div>

                {step.action && <div className="shrink-0">{step.action}</div>}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
