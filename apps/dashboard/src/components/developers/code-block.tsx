"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CodeTab {
  label: string;
  language?: string;
  code: string;
}

interface CodeBlockProps {
  tabs?: CodeTab[];
  singleCode?: string;
  language?: string;
  filename?: string;
  className?: string;
}

export function CodeBlock({
  tabs,
  singleCode,
  language = "typescript",
  filename,
  className,
}: CodeBlockProps) {
  const activeTabs = tabs && tabs.length > 0 ? tabs : [{ label: language, code: singleCode || "" }];
  const [activeTabIdx, setActiveTabIdx] = useState(0);
  const [copied, setCopied] = useState(false);

  const currentCode = activeTabs[activeTabIdx]?.code || "";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className={cn("overflow-hidden rounded-xl border border-border/70 bg-card/70 backdrop-blur-sm shadow-sm", className)}>
      <div className="flex items-center justify-between border-b border-border/50 bg-muted/40 px-3 py-2 text-xs">
        <div className="flex items-center gap-2">
          {filename && (
            <span className="font-mono text-[11px] font-medium text-foreground/80 px-2 py-0.5 rounded bg-background/50 border border-border/40">
              {filename}
            </span>
          )}
          {activeTabs.length > 1 && (
            <div className="flex items-center gap-1">
              {activeTabs.map((tab, idx) => (
                <button
                  key={tab.label}
                  type="button"
                  onClick={() => setActiveTabIdx(idx)}
                  className={cn(
                    "rounded px-2.5 py-1 font-mono text-[11px] transition-colors",
                    activeTabIdx === idx
                      ? "bg-background text-foreground font-semibold shadow-xs border border-border/50"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-7 gap-1 px-2 text-[11px] text-muted-foreground hover:text-foreground"
          aria-label="Copy code snippet"
        >
          {copied ? (
            <>
              <Check className="size-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="size-3.5" />
              <span>Copy</span>
            </>
          )}
        </Button>
      </div>

      <div className="p-4 overflow-x-auto bg-[#0a0f12]/90 text-xs font-mono leading-relaxed text-emerald-50 selection:bg-emerald-500/30">
        <pre className="overflow-x-auto">
          <code>{currentCode}</code>
        </pre>
      </div>
    </div>
  );
}
