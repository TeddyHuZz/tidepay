"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Terminal,
  ExternalLink,
  ChevronUp,
  Radio,
  Zap,
  BookOpen,
  Code2,
  Cpu,
  Layers,
  Check,
  Copy,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TIDEPAY_PROGRAM_ID } from "@tidepay/types";

export function DeveloperDockButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleCopyProgramId = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(TIDEPAY_PROGRAM_ID);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <div ref={containerRef} className="relative mt-auto hidden md:block">
      {/* Floating Popover Menu (Stripe Developer Menu Style) */}
      {isOpen && (
        <div
          role="menu"
          aria-label="Developer Menu"
          className="absolute bottom-full left-0 mb-2 w-72 origin-bottom-left rounded-xl border border-border/80 bg-[#0d1316]/95 p-3 shadow-2xl backdrop-blur-xl animate-in fade-in-0 zoom-in-95 duration-150 z-50 flex flex-col gap-3 text-xs"
        >
          {/* Header & Cluster Status */}
          <div className="flex items-center justify-between border-b border-border/50 pb-2.5 px-1">
            <div className="flex items-center gap-1.5 font-semibold text-foreground">
              <Terminal className="size-3.5 text-primary" />
              <span>Developers</span>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Devnet
            </div>
          </div>

          {/* Section: Workbench */}
          <div className="flex flex-col gap-0.5">
            <div className="px-2 py-1 text-[10px] font-bold tracking-wider text-muted-foreground/80 uppercase font-mono">
              Workbench
            </div>

            <Link
              href="/developers?topic=architecture"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-muted-foreground hover:bg-accent/60 hover:text-foreground transition-colors"
            >
              <Layers className="size-3.5 text-primary/80" />
              <span>Overview & Architecture</span>
            </Link>

            <Link
              href="/developers?topic=webhook-simulator"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-muted-foreground hover:bg-accent/60 hover:text-foreground transition-colors"
            >
              <Radio className="size-3.5 text-emerald-400/80" />
              <span>Webhooks & Simulator</span>
            </Link>

            <Link
              href="/developers?topic=blink-tester"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-muted-foreground hover:bg-accent/60 hover:text-foreground transition-colors"
            >
              <Zap className="size-3.5 text-amber-400/80" />
              <span>Blink & Dial.to Tester</span>
            </Link>
          </div>

          {/* Section: Documentation */}
          <div className="flex flex-col gap-0.5 border-t border-border/50 pt-2">
            <div className="px-2 py-1 text-[10px] font-bold tracking-wider text-muted-foreground/80 uppercase font-mono">
              Documentation
            </div>

            <Link
              href="/developers?topic=getting-started"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between rounded-lg px-2 py-1.5 text-muted-foreground hover:bg-accent/60 hover:text-foreground transition-colors"
            >
              <div className="flex items-center gap-2">
                <BookOpen className="size-3.5 text-primary/80" />
                <span>API Reference</span>
              </div>
              <ExternalLink className="size-3 text-muted-foreground/60" />
            </Link>

            <Link
              href="/developers?topic=sdk-install"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between rounded-lg px-2 py-1.5 text-muted-foreground hover:bg-accent/60 hover:text-foreground transition-colors"
            >
              <div className="flex items-center gap-2">
                <Code2 className="size-3.5 text-primary/80" />
                <span>TypeScript SDK</span>
              </div>
              <ExternalLink className="size-3 text-muted-foreground/60" />
            </Link>

            <Link
              href="/developers?topic=crank-keeper"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between rounded-lg px-2 py-1.5 text-muted-foreground hover:bg-accent/60 hover:text-foreground transition-colors"
            >
              <div className="flex items-center gap-2">
                <Cpu className="size-3.5 text-primary/80" />
                <span>Keeper Crank Bot</span>
              </div>
              <ExternalLink className="size-3 text-muted-foreground/60" />
            </Link>
          </div>

          {/* Section: Quick Config & Program ID */}
          <div className="border-t border-border/50 pt-2 flex flex-col gap-1.5 px-1">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
              <span>Program ID</span>
              <button
                type="button"
                onClick={handleCopyProgramId}
                className="hover:text-foreground flex items-center gap-1 text-[10px] text-primary"
              >
                {copiedId ? (
                  <>
                    <Check className="size-3 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <code className="rounded bg-background/60 border border-border/40 px-2 py-1 font-mono text-[10px] text-foreground/80 truncate">
              {TIDEPAY_PROGRAM_ID}
            </code>
            <div className="text-[10px] text-muted-foreground/70 font-mono flex items-center justify-between mt-0.5">
              <span>Crank Status:</span>
              <span className="text-emerald-400">Online · 15s poll</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Bottom Dock Button (Matching Stripe [>_ Developers]) */}
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex w-full items-center justify-between rounded-xl border p-3 text-left transition-all outline-none",
          isOpen
            ? "border-primary/50 bg-primary/10 text-foreground shadow-md ring-1 ring-primary/30"
            : "border-border/60 bg-card/60 text-muted-foreground hover:border-border hover:bg-accent/50 hover:text-foreground"
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-background/80 border border-border/60 text-primary">
            <Terminal className="size-3.5" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-foreground truncate">Developers</span>
          </div>
        </div>

        <ChevronUp
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180 text-primary"
          )}
        />
      </button>
    </div>
  );
}
