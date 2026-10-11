"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markBlinkShared } from "@/components/onboarding/onboarding-state";

export function CopyButton({
  value,
  label,
  onCopy,
}: {
  value: string;
  label: string;
  onCopy?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      onCopy?.();

      const lowerLabel = label.toLowerCase();
      const lowerVal = value.toLowerCase();
      if (
        lowerLabel.includes("blink") ||
        lowerLabel.includes("checkout") ||
        lowerLabel.includes("embed") ||
        lowerLabel.includes("action") ||
        lowerVal.includes("actions") ||
        lowerVal.includes("checkout") ||
        lowerVal.includes("dial.to")
      ) {
        markBlinkShared();
      }

      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Button variant="outline" size="icon" aria-label={copied ? "Copied" : label} onClick={() => void copy()}>
      {copied ? <Check /> : <Copy />}
    </Button>
  );
}
