"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Sparkles,
  CheckCircle2,
  Circle,
  BookOpen,
  ChevronDown,
  ArrowRight,
  Plus,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMerchantData } from "@/components/merchant-data-provider";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalkthroughModal } from "./walkthrough-modal";
import { cn } from "@/lib/utils";
import { isBlinkSharedLocally, markBlinkShared } from "./onboarding-state";

const STORAGE_COLLAPSED_KEY = "tidepay_sidebar_onboarding_collapsed";

export function SidebarOnboardingWidget() {
  const { connected } = useWallet();
  const { state } = useMerchantData();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isWalkthroughOpen, setIsWalkthroughOpen] = useState(false);
  const [isBlinkShared, setIsBlinkShared] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem(STORAGE_COLLAPSED_KEY);
    if (saved === "true") setIsCollapsed(true);

    setIsBlinkShared(isBlinkSharedLocally());

    const handleBlinkShared = () => setIsBlinkShared(true);
    window.addEventListener("tidepay:blink-shared", handleBlinkShared);
    window.addEventListener("storage", handleBlinkShared);

    return () => {
      window.removeEventListener("tidepay:blink-shared", handleBlinkShared);
      window.removeEventListener("storage", handleBlinkShared);
    };
  }, []);

  if (!mounted) return null;

  const plans = state.status === "ready" ? state.data.plans : [];
  const subscribers = state.status === "ready" ? state.data.subscribers : [];

  const hasConnected = connected;
  const hasCreatedPlan = plans.length > 0;
  const hasSubscribers = subscribers.length > 0;
  const hasSharedBlink = isBlinkShared || hasSubscribers;
  const hasSettlement = subscribers.some((s) => s.status === "Active") || plans.length > 0;

  const steps = [
    {
      id: "wallet",
      title: "Connect Wallet",
      completed: hasConnected,
    },
    {
      id: "plan",
      title: "Create Plan",
      completed: hasCreatedPlan,
      action: !hasCreatedPlan ? (
        <Link
          href="/plans/new"
          className="text-[10px] text-primary hover:underline flex items-center gap-0.5 ml-auto shrink-0 font-medium"
        >
          <Plus className="size-2.5" />
          New
        </Link>
      ) : null,
    },
    {
      id: "blink",
      title: "Share Blink",
      completed: hasSharedBlink,
      action: hasCreatedPlan && !hasSharedBlink ? (
        <Link
          href={plans[0] ? `/plans/${encodeURIComponent(plans[0].name || plans[0].id)}` : "/plans"}
          className="text-[10px] text-primary hover:underline flex items-center gap-0.5 ml-auto shrink-0 font-medium"
        >
          <Share2 className="size-2.5" />
          Share
        </Link>
      ) : null,
    },
    {
      id: "crank",
      title: "Automated Crank",
      completed: hasSettlement,
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  // When all onboarding milestones are complete (100%), hide panel to avoid interruption
  if (completedCount >= steps.length) {
    if (isWalkthroughOpen) {
      return (
        <WalkthroughModal
          isOpen={isWalkthroughOpen}
          onClose={() => setIsWalkthroughOpen(false)}
        />
      );
    }
    return null;
  }

  const toggleCollapsed = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem(STORAGE_COLLAPSED_KEY, String(next));
  };

  return (
    <>
      <WalkthroughModal
        isOpen={isWalkthroughOpen}
        onClose={() => setIsWalkthroughOpen(false)}
      />

      <div className="flex flex-col rounded-xl border border-border/70 bg-card/60 backdrop-blur-sm overflow-hidden text-xs shadow-xs transition-all w-full">
        {/* Header Bar */}
        <div
          onClick={toggleCollapsed}
          className="flex items-center justify-between p-2.5 cursor-pointer hover:bg-accent/40 transition-colors select-none"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-foreground text-[11px] leading-tight truncate">Getting Started</span>
              <span className="text-[10px] text-muted-foreground font-mono">
                {completedCount}/{steps.length} completed
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] font-mono font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
              {progressPercent}%
            </span>
            <ChevronDown
              className={cn("size-3.5 text-muted-foreground transition-transform duration-200", isCollapsed && "-rotate-90")}
            />
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 w-full bg-accent/60 overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Expanded Steps List */}
        {!isCollapsed && (
          <div className="flex flex-col p-2.5 pt-2 gap-1.5 border-t border-border/40">
            <div className="flex flex-col gap-1">
              {steps.map((step, idx) => (
                <div
                  key={step.id}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors text-[11px]",
                    step.completed ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {step.completed ? (
                    <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                  ) : (
                    <Circle className="size-3.5 text-muted-foreground/60 shrink-0" />
                  )}
                  <span className={cn("truncate font-medium", step.completed && "text-foreground")}>
                    {idx + 1}. {step.title}
                  </span>
                  {step.action}
                </div>
              ))}
            </div>

            {/* Quickstart Tour CTA */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsWalkthroughOpen(true)}
              className="mt-1.5 h-7 w-full justify-center gap-1.5 text-[11px] font-medium text-primary hover:bg-primary/10 hover:text-primary border-primary/30 cursor-pointer"
            >
              <BookOpen className="size-3" />
              <span>Interactive Guide</span>
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
