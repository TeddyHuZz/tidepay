"use client";

import { useState, useRef, useEffect } from "react";
import {
  Share2,
  Copy,
  Check,
  ExternalLink,
  MessageCircle,
  Send,
  Zap,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { API_URL, blinkUrl } from "@/lib/chain/config";
import { cn } from "@/lib/utils";
import { markBlinkShared } from "@/components/onboarding/onboarding-state";

interface ShareBlinkButtonProps {
  planId: string;
  planName: string;
  priceUsdc?: string;
  variant?: "default" | "outline";
  size?: "default" | "sm";
  className?: string;
  align?: "left" | "right";
}

export function ShareBlinkButton({
  planId,
  planName,
  priceUsdc,
  variant = "default",
  size = "sm",
  className,
  align = "right",
}: ShareBlinkButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { success: toastSuccess, info: toastInfo } = useToast();

  const actionUrl = `${API_URL}/api/actions/subscribe/${planId}`;
  const dialUrl = blinkUrl(planId);

  // Close menu when clicking outside or pressing Escape
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleCopy = (text: string, key: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    markBlinkShared();
    toastSuccess("Copied to clipboard", `${label} copied!`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const shareToTwitter = () => {
    const text = `Subscribe to ${planName} with 1-click on Solana using @tidepay_xyz Blink:`;
    const tweetUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(actionUrl)}`;
    markBlinkShared();
    window.open(tweetUrl, "_blank", "noopener,noreferrer");
    setIsOpen(false);
  };

  const shareToTelegram = () => {
    const text = `Subscribe to ${planName} with 1-click via TidePay on Solana`;
    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(actionUrl)}&text=${encodeURIComponent(text)}`;
    markBlinkShared();
    window.open(tgUrl, "_blank", "noopener,noreferrer");
    setIsOpen(false);
  };

  const shareToDiscord = () => {
    const message = `Subscribe to **${planName}**${priceUsdc ? ` (${priceUsdc} USDC)` : ""} with 1-click on Solana: ${actionUrl}`;
    navigator.clipboard.writeText(message);
    markBlinkShared();
    toastInfo("Discord format copied", "Paste into any Discord channel or DM to share this Blink!");
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <Button
        type="button"
        size={size}
        variant={variant === "outline" ? "outline" : "default"}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "gap-1.5 font-medium transition-all",
          variant === "default" && "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
          className
        )}
      >
        <Zap className="size-3.5 fill-current" />
        <span>Share Blink</span>
        <ChevronDown className={cn("size-3.5 transition-transform duration-200", isOpen && "rotate-180")} />
      </Button>

      {isOpen && (
        <div
          className={cn(
            "absolute z-50 mt-2 w-72 rounded-xl border border-border/80 bg-popover/95 p-1.5 text-popover-foreground shadow-xl backdrop-blur-md outline-none",
            "animate-in fade-in-0 zoom-in-95 duration-150",
            align === "right" ? "right-0" : "left-0"
          )}
        >
          <div className="px-2.5 py-2 border-b border-border/50">
            <p className="text-xs font-semibold text-foreground">Distribute Solana Blink</p>
            <p className="text-[11px] text-muted-foreground">
              Share on social media for 1-click wallet subscriptions.
            </p>
          </div>

          <div className="flex flex-col gap-0.5 py-1">
            {/* Share to X (Twitter) */}
            <button
              type="button"
              onClick={shareToTwitter}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors text-left"
            >
              <div className="flex size-6 items-center justify-center rounded-md bg-foreground/10 text-foreground">
                <svg className="size-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-medium">Post to X (Twitter)</span>
                <span className="text-[10px] text-muted-foreground">Unfurls native Blink card on X</span>
              </div>
            </button>

            {/* Share to Telegram */}
            <button
              type="button"
              onClick={shareToTelegram}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors text-left"
            >
              <div className="flex size-6 items-center justify-center rounded-md bg-[#229ED9]/15 text-[#229ED9]">
                <Send className="size-3.5" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-medium">Share on Telegram</span>
                <span className="text-[10px] text-muted-foreground">Direct link with 1-click checkout</span>
              </div>
            </button>

            {/* Copy for Discord */}
            <button
              type="button"
              onClick={shareToDiscord}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors text-left"
            >
              <div className="flex size-6 items-center justify-center rounded-md bg-[#5865F2]/15 text-[#5865F2]">
                <MessageCircle className="size-3.5" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-medium">Copy for Discord</span>
                <span className="text-[10px] text-muted-foreground">Formatted message with action URL</span>
              </div>
            </button>

            {/* Copy Direct Action URL */}
            <button
              type="button"
              onClick={() => handleCopy(actionUrl, "action", "Solana Action URL")}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors text-left"
            >
              <div className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                {copiedKey === "action" ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-medium">{copiedKey === "action" ? "Copied!" : "Copy Blink Action URL"}</span>
                <span className="text-[10px] text-muted-foreground truncate">{actionUrl}</span>
              </div>
            </button>
          </div>

          {/* Secondary / Playground Link */}
          <div className="border-t border-border/50 pt-1 mt-0.5">
            <a
              href={dialUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => setIsOpen(false)}
              className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Share2 className="size-3" />
                Open on Dial.to (Playground)
              </span>
              <ExternalLink className="size-3 opacity-60" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
