"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Zap,
  Share2,
  Cpu,
  ChevronRight,
  ChevronLeft,
  X,
  Sparkles,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface WalkthroughModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SLIDES = [
  {
    step: "01",
    badge: "Non-Custodial Architecture",
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    title: "Zero Escrow. 100% Non-Custodial.",
    subtitle: "How recurring payments work without holding user funds.",
    icon: ShieldCheck,
    iconColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    highlights: [
      {
        title: "Delegated Pull Authority",
        description: "Subscribers approve a token allowance. Funds stay in their wallet until the exact second an epoch is settled.",
      },
      {
        title: "Direct Merchant Settlement",
        description: "Pulls transfer directly from subscriber wallet to merchant wallet via Solana Token-2022 / SPL Token checked transfers.",
      },
      {
        title: "1-Click User Cancellation",
        description: "Subscribers can revoke authority at any time, instantly closing on-chain accounts and reclaiming rent lamports.",
      },
    ],
  },
  {
    step: "02",
    badge: "On-Chain Plans",
    badgeColor: "bg-primary/10 text-primary border-primary/30",
    title: "Deploying Plans to Solana",
    subtitle: "Deterministic time-locked subscriptions powered by Anchor PDAs.",
    icon: Zap,
    iconColor: "text-primary bg-primary/10 border-primary/20",
    highlights: [
      {
        title: "USDC Native Pricing",
        description: "Denominated in Circle USDC with exact token decimal enforcement on Devnet and Mainnet.",
      },
      {
        title: "60-Second Fast-Forward Testing",
        description: "Test intervals down to 1 minute on Devnet so you can demo recurring renewals in real-time.",
      },
      {
        title: "On-Chain Plan PDA",
        description: "Each plan is a verifiable Solana program-derived account containing price, billing cycle, and status.",
      },
    ],
  },
  {
    step: "03",
    badge: "Distribution",
    badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    title: "1-Click Blinks & Hosted Checkout",
    subtitle: "Share subscriptions across social media and embed on any website.",
    icon: Share2,
    iconColor: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    highlights: [
      {
        title: "Solana Blinks on X (Twitter)",
        description: "Post your Action link on X — it automatically unfurls into an interactive subscription card for Phantom and Backpack.",
      },
      {
        title: "Hosted Checkout Page",
        description: "Clean standalone checkout URL (`/checkout/[plan]`) for web merchants and direct customer links.",
      },
      {
        title: "Embeddable Widget",
        description: "Drop a 1-line iframe or JavaScript snippet into React, Next.js, Webflow, or Shopify storefronts.",
      },
    ],
  },
  {
    step: "04",
    badge: "Automation",
    badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    title: "Decentralized Keeper Crank",
    subtitle: "Automated recurring epoch settlements without merchant intervention.",
    icon: Cpu,
    iconColor: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    highlights: [
      {
        title: "Automated Epoch Cranking",
        description: "Background keeper workers monitor next_epoch_timestamp and submit process_epoch transactions when due.",
      },
      {
        title: "Incentivized Bounties",
        description: "Each renewal pull rewards the keeper with a small USDC bounty (e.g. 0.05 USDC), subsidizing network gas.",
      },
      {
        title: "Live Status Monitoring",
        description: "Track keeper heartbeat, last pull timestamps, and pending epochs directly on your dashboard.",
      },
    ],
  },
];

export function WalkthroughModal({ isOpen, onClose }: WalkthroughModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  if (!isOpen) return null;

  const slide = SLIDES[currentSlide];
  const Icon = slide.icon;
  const isFirst = currentSlide === 0;
  const isLast = currentSlide === SLIDES.length - 1;

  const handleNext = () => {
    if (isLast) {
      onClose();
    } else {
      setCurrentSlide((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) {
      setCurrentSlide((prev) => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl rounded-2xl border border-border/80 bg-card p-6 md:p-8 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="walkthrough-title"
      >
        {/* Background glow decoration */}
        <div className="absolute -top-24 -right-24 size-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 size-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="size-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground uppercase tracking-wider">TidePay Platform Guide</p>
              <p className="text-[11px] text-muted-foreground">Step {currentSlide + 1} of {SLIDES.length}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Close walkthrough"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Slide Content */}
        <div className="mt-6 flex flex-col gap-6">
          <div className="flex items-start gap-4">
            <div className={cn("flex size-14 shrink-0 items-center justify-center rounded-2xl border shadow-sm", slide.iconColor)}>
              <Icon className="size-7" />
            </div>
            <div className="flex flex-col gap-1.5 min-w-0">
              <Badge variant="outline" className={cn("w-fit text-[11px] font-medium border", slide.badgeColor)}>
                {slide.badge}
              </Badge>
              <h2 id="walkthrough-title" className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
                {slide.title}
              </h2>
              <p className="text-xs md:text-sm text-muted-foreground">
                {slide.subtitle}
              </p>
            </div>
          </div>

          {/* Key Highlights Grid */}
          <div className="grid gap-3 pt-2">
            {slide.highlights.map((h, i) => (
              <div key={i} className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/60 p-3.5 transition-colors">
                <CheckCircle2 className="size-4 text-primary shrink-0 mt-0.5" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-semibold text-foreground">{h.title}</span>
                  <span className="text-xs text-muted-foreground leading-relaxed">{h.description}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Navigation Bar */}
        <div className="mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-border/50">
          {/* Slide Indicator Dots */}
          <div className="flex items-center gap-1.5 self-center sm:self-auto">
            {SLIDES.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentSlide(idx)}
                className={cn(
                  "h-1.5 rounded-full transition-all cursor-pointer",
                  currentSlide === idx ? "w-6 bg-primary" : "w-1.5 bg-border hover:bg-muted-foreground"
                )}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2.5">
            {!isFirst && (
              <Button variant="outline" size="sm" onClick={handlePrev} className="gap-1 text-xs">
                <ChevronLeft className="size-3.5" />
                Back
              </Button>
            )}

            {isLast ? (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
                  Done
                </Button>
                <Button asChild size="sm" className="gap-1.5 text-xs bg-primary text-primary-foreground font-medium">
                  <Link href="/plans/new" onClick={onClose}>
                    Create Your First Plan
                    <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
              </div>
            ) : (
              <Button size="sm" onClick={handleNext} className="gap-1 text-xs bg-primary text-primary-foreground font-medium">
                Next
                <ChevronRight className="size-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
