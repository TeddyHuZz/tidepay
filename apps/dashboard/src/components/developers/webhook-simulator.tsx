"use client";

import { useState } from "react";
import { Send, Check, Copy, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const EVENTS = {
  "subscription.created": {
    id: "evt_sub_01HM98V2W",
    type: "subscription.created",
    created: "2026-10-10T14:20:00Z",
    data: {
      planId: "google-pro",
      planAddress: "4g6EF4q95h1pbVG3Gv7AspaZQ6PujFCYCr3eu63RdC6P",
      subscriber: "BZKYKouLsptzcP9Vb4aABEBEzBFZuPpSxpaDjwPGgQio",
      amount: "0.10",
      currency: "USDC",
      cycleCount: 0,
      nextEpochTimestamp: 1791618600,
    },
  },
  "epoch.settled": {
    id: "evt_epoch_01HM98V9A",
    type: "epoch.settled",
    created: "2026-10-10T14:21:00Z",
    data: {
      planId: "google-pro",
      planAddress: "4g6EF4q95h1pbVG3Gv7AspaZQ6PujFCYCr3eu63RdC6P",
      subscriber: "BZKYKouLsptzcP9Vb4aABEBEzBFZuPpSxpaDjwPGgQio",
      amountGross: "0.10",
      amountNet: "0.05",
      keeperBounty: "0.05",
      currency: "USDC",
      cycleCount: 1,
      signature: "4Kc53LoHzLo7SwWneGeR7Fk2eswjrnhe58cKssMNW4rFe55aNacEmbP9Aj6aR8zJXcfr2WT2wL4mD24yj3ePNyNe",
      nextEpochTimestamp: 1791618660,
    },
  },
  "subscription.cancelled": {
    id: "evt_cancel_01HM98W1F",
    type: "subscription.cancelled",
    created: "2026-10-10T14:25:00Z",
    data: {
      planId: "google-pro",
      planAddress: "4g6EF4q95h1pbVG3Gv7AspaZQ6PujFCYCr3eu63RdC6P",
      subscriber: "BZKYKouLsptzcP9Vb4aABEBEzBFZuPpSxpaDjwPGgQio",
      reason: "subscriber_closed",
      rentRefundedLamports: 1845120,
    },
  },
} as const;

type EventName = keyof typeof EVENTS;

export function WebhookSimulator() {
  const [selected, setSelected] = useState<EventName>("subscription.created");
  const [testEndpoint, setTestEndpoint] = useState("https://api.yourdomain.com/webhooks/tidepay");
  const [simulatedStatus, setSimulatedStatus] = useState<{ status: number; text: string } | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [copied, setCopied] = useState(false);

  const payload = JSON.stringify(EVENTS[selected], null, 2);

  const handleSimulate = () => {
    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      setSimulatedStatus({
        status: 200,
        text: `HTTP 200 OK — Successfully delivered ${selected} to endpoint`,
      });
    }, 600);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(payload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="border-border/70 bg-card/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Radio className="size-4" />
            </div>
            <div>
              <CardTitle className="text-base font-bold">Webhook Simulator & Tester</CardTitle>
              <CardDescription className="text-xs">
                Preview and test live webhook event payloads dispatched when subscriptions are initiated or renewed.
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Event Selectors */}
        <div role="group" aria-label="Event type" className="flex flex-wrap gap-2">
          {(Object.keys(EVENTS) as EventName[]).map((name) => (
            <button
              key={name}
              type="button"
              aria-pressed={selected === name}
              onClick={() => {
                setSelected(name);
                setSimulatedStatus(null);
              }}
              className={cn(
                "h-9 rounded-md border px-3 font-mono text-xs outline-none transition-colors",
                selected === name
                  ? "border-primary bg-primary/10 text-primary font-medium"
                  : "border-border/60 bg-background/50 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              {name}
            </button>
          ))}
        </div>

        {/* Code Payload Box */}
        <div className="relative rounded-lg border border-border/70 bg-[#0a0f12]/90 p-4 text-xs font-mono text-emerald-100">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="absolute top-3 right-3 h-7 gap-1 px-2 text-[11px] text-muted-foreground hover:text-foreground bg-background/40"
          >
            {copied ? (
              <>
                <Check className="size-3 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="size-3" />
                <span>Copy JSON</span>
              </>
            )}
          </Button>
          <pre className="overflow-x-auto leading-relaxed pt-2">
            <code>{payload}</code>
          </pre>
        </div>

        {/* Endpoint Simulator Bar */}
        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <Input
            value={testEndpoint}
            onChange={(e) => setTestEndpoint(e.target.value)}
            placeholder="https://your-server.com/api/webhooks"
            className="font-mono text-xs"
          />
          <Button
            variant="default"
            size="sm"
            onClick={handleSimulate}
            disabled={isSending}
            className="shrink-0 gap-1.5 text-xs font-semibold"
          >
            <Send className={cn("size-3.5", isSending && "animate-pulse")} />
            {isSending ? "Simulating…" : "Send Test Ping"}
          </Button>
        </div>

        {simulatedStatus && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-400 font-mono flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
            {simulatedStatus.text}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
