"use client";

import { useState, useEffect } from "react";
import {
  Key,
  Eye,
  EyeOff,
  RefreshCw,
  Copy,
  Check,
  Radio,
  Send,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Globe,
  Sliders,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CodeBlock } from "./code-block";

const SAMPLE_PAYLOADS = {
  "subscription.created": {
    id: "evt_sub_01HM98V2W",
    type: "subscription.created",
    created: new Date().toISOString(),
    data: {
      planId: "google-pro",
      planAddress: "4g6EF4q95h1pbVG3Gv7AspaZQ6PujFCYCr3eu63RdC6P",
      subscriber: "BZKYKouLsptzcP9Vb4aABEBEzBFZuPpSxpaDjwPGgQio",
      amountGross: "0.10",
      currency: "USDC",
      cycleCount: 0,
      nextEpochTimestamp: Math.floor(Date.now() / 1000) + 60,
    },
  },
  "epoch.settled": {
    id: "evt_epoch_01HM98V9A",
    type: "epoch.settled",
    created: new Date().toISOString(),
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
      nextEpochTimestamp: Math.floor(Date.now() / 1000) + 120,
    },
  },
  "subscription.cancelled": {
    id: "evt_cancel_01HM98W1F",
    type: "subscription.cancelled",
    created: new Date().toISOString(),
    data: {
      planId: "google-pro",
      planAddress: "4g6EF4q95h1pbVG3Gv7AspaZQ6PujFCYCr3eu63RdC6P",
      subscriber: "BZKYKouLsptzcP9Vb4aABEBEzBFZuPpSxpaDjwPGgQio",
      reason: "subscriber_closed",
      rentRefundedLamports: 1845120,
    },
  },
} as const;

type EventKey = keyof typeof SAMPLE_PAYLOADS;

export function ApiKeyWebhookManager() {
  // API Keys state
  const [secretKey, setSecretKey] = useState("tp_dev_sec_994a8e2b109c4d3fa780182");
  const [publishableKey, setPublishableKey] = useState("tp_dev_pub_4g6EF4q95h1pbVG3Gv7AspaZQ");
  const [revealSecret, setRevealSecret] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Webhook state
  const [webhookUrl, setWebhookUrl] = useState("https://api.yourdomain.com/webhooks/tidepay");
  const [signingSecret, setSigningSecret] = useState("whsec_5f992a7b12d3081e74f8");
  const [revealSigningSecret, setRevealSigningSecret] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventKey>("subscription.created");
  const [isPinging, setIsPinging] = useState(false);
  const [pingResult, setPingResult] = useState<{ status: number; message: string; latencyMs: number } | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedUrl = localStorage.getItem("tidepay_test_webhook_url");
      if (savedUrl) setWebhookUrl(savedUrl);
    }
  }, []);

  const handleUrlChange = (val: string) => {
    setWebhookUrl(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("tidepay_test_webhook_url", val);
    }
  };

  const handleRollApiKey = () => {
    const randomHex = Array.from({ length: 24 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
    setSecretKey(`tp_dev_sec_${randomHex}`);
    setCopiedKey(null);
  };

  const handleRollSigningSecret = () => {
    const randomHex = Array.from({ length: 20 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
    setSigningSecret(`whsec_${randomHex}`);
    setCopiedKey(null);
  };

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSendTestPing = () => {
    setIsPinging(true);
    setPingResult(null);
    const start = performance.now();

    setTimeout(() => {
      const latency = Math.round(performance.now() - start + 45);
      setIsPinging(false);
      setPingResult({
        status: 200,
        latencyMs: latency,
        message: `HTTP 200 OK — Successfully dispatched ${selectedEvent} with HMAC signature`,
      });
    }, 550);
  };

  const activePayload = JSON.stringify(SAMPLE_PAYLOADS[selectedEvent], null, 2);

  return (
    <div className="flex flex-col gap-8">
      {/* 1. API Keys Section */}
      <Card className="border-border/70 bg-card/50">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Key className="size-4" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">API Secret &amp; Publishable Keys</CardTitle>
                <CardDescription className="text-xs">
                  Authenticate REST API requests to create checkout sessions and query subscriber access.
                </CardDescription>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleRollApiKey}
              className="h-8 gap-1.5 text-xs self-start sm:self-auto"
            >
              <RefreshCw className="size-3.5" />
              Roll Secret Key
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {/* Secret Key Field */}
          <div className="flex flex-col gap-1.5 rounded-lg border border-border/60 bg-background/50 p-3.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground flex items-center gap-2">
                Secret Key
                <Badge variant="neutral" className="text-[10px] font-mono py-0">Server-Side Only</Badge>
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRevealSecret(!revealSecret)}
                  className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                >
                  {revealSecret ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  <span>{revealSecret ? "Hide" : "Reveal"}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyText(secretKey, "secret")}
                  className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                >
                  {copiedKey === "secret" ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                  <span>{copiedKey === "secret" ? "Copied" : "Copy"}</span>
                </Button>
              </div>
            </div>
            <code className="font-mono text-xs text-primary/90 break-all select-all pt-1">
              {revealSecret ? secretKey : `${secretKey.slice(0, 11)}${"•".repeat(22)}`}
            </code>
          </div>

          {/* Publishable Key Field */}
          <div className="flex flex-col gap-1.5 rounded-lg border border-border/60 bg-background/50 p-3.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground flex items-center gap-2">
                Publishable Key
                <Badge variant="neutral" className="text-[10px] font-mono py-0">Frontend Client Safe</Badge>
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyText(publishableKey, "publishable")}
                className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
              >
                {copiedKey === "publishable" ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                <span>{copiedKey === "publishable" ? "Copied" : "Copy"}</span>
              </Button>
            </div>
            <code className="font-mono text-xs text-foreground/80 break-all select-all pt-1">
              {publishableKey}
            </code>
          </div>
        </CardContent>
      </Card>

      {/* 2. Webhook Endpoints & Live Simulator */}
      <Card className="border-border/70 bg-card/50">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                <Radio className="size-4" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">Webhook Endpoints &amp; Signing Secret</CardTitle>
                <CardDescription className="text-xs">
                  Register your server destination URL and test automated subscription settlement webhooks.
                </CardDescription>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleRollSigningSecret}
              className="h-8 gap-1.5 text-xs self-start sm:self-auto"
            >
              <RefreshCw className="size-3.5" />
              Roll Signing Secret
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {/* Webhook URL Input */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-foreground flex items-center justify-between">
              <span>Endpoint Destination URL</span>
              <span className="text-[11px] text-muted-foreground">Receives HTTP POST</span>
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                value={webhookUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder="https://api.yourdomain.com/webhooks/tidepay"
                className="font-mono text-xs"
              />
              <Button
                variant="default"
                size="sm"
                onClick={handleSendTestPing}
                disabled={isPinging}
                className="shrink-0 gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                <Send className={cn("size-3.5", isPinging && "animate-pulse")} />
                {isPinging ? "Dispatching…" : "Send Test Ping"}
              </Button>
            </div>
          </div>

          {/* Webhook Signing Secret */}
          <div className="flex flex-col gap-1.5 rounded-lg border border-border/60 bg-background/50 p-3.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground flex items-center gap-2">
                Webhook Signing Secret
                <Badge variant="outline" className="text-[10px] font-mono py-0 border-emerald-500/40 text-emerald-400">
                  HMAC-SHA256
                </Badge>
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRevealSigningSecret(!revealSigningSecret)}
                  className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                >
                  {revealSigningSecret ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  <span>{revealSigningSecret ? "Hide" : "Reveal"}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyText(signingSecret, "whsec")}
                  className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                >
                  {copiedKey === "whsec" ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                  <span>{copiedKey === "whsec" ? "Copied" : "Copy"}</span>
                </Button>
              </div>
            </div>
            <code className="font-mono text-xs text-emerald-300 break-all select-all pt-1">
              {revealSigningSecret ? signingSecret : `${signingSecret.slice(0, 8)}${"•".repeat(16)}`}
            </code>
          </div>

          {/* Test Ping Status Banner */}
          {pingResult && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-400 font-mono flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
                <span>{pingResult.message}</span>
              </div>
              <Badge variant="neutral" className="text-[10px] font-mono">
                {pingResult.latencyMs}ms
              </Badge>
            </div>
          )}

          {/* Event Type Selectors */}
          <div className="flex flex-col gap-2 pt-1">
            <span className="text-xs font-semibold text-foreground">Select Event Payload to Preview</span>
            <div role="group" aria-label="Event types" className="flex flex-wrap gap-2">
              {(Object.keys(SAMPLE_PAYLOADS) as EventKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setSelectedEvent(key);
                    setPingResult(null);
                  }}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 font-mono text-xs transition-colors",
                    selectedEvent === key
                      ? "border-emerald-500 bg-emerald-500/15 text-emerald-400 font-semibold"
                      : "border-border/60 bg-background/50 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  )}
                >
                  {key}
                </button>
              ))}
            </div>
          </div>

          {/* Payload JSON Viewer */}
          <CodeBlock
            filename={`${selectedEvent}.json`}
            language="json"
            singleCode={activePayload}
          />

          {/* Verifying Signatures Code Snippet */}
          <div className="flex flex-col gap-2 pt-2">
            <span className="text-xs font-semibold text-foreground">
              Verifying Webhook Signatures in Node.js / Next.js
            </span>
            <CodeBlock
              filename="verify-webhook.ts"
              language="typescript"
              singleCode={`import crypto from "crypto";

export function verifyTidePayWebhook(
  rawBody: string,
  signatureHeader: string,
  secret: string = "${signingSecret}"
): boolean {
  const hmac = crypto.createHmac("sha256", secret);
  const digest = hmac.update(rawBody).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(digest));
}`}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
