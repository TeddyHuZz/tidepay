"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  Globe,
  Key,
  Radio,
  RefreshCw,
  Send,
  Terminal,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { generateRandomHex, useProject } from "@/components/project-context";
import { cn } from "@/lib/utils";

export const WEBHOOK_EVENTS = [
  "subscription.created",
  "epoch.settled",
  "subscription.cancelled",
] as const;

export type EventKey = (typeof WEBHOOK_EVENTS)[number];
export type PayloadChain = "solana" | "near";

function buildSamplePayload(event: EventKey, chain: PayloadChain, epochSeconds: number) {
  if (chain === "near") {
    switch (event) {
      case "subscription.created":
        return {
          id: "evt_01JCH9X4M2P8Q7R5V1W3Z6B9N0",
          type: "subscription.created",
          chain: "near",
          created: epochSeconds,
          livemode: false,
          data: {
            contract_id: "tidepay-mw1rpoyp.tidepay-e2e-mw1rpm6j.testnet",
            plan_id: "claude-pro",
            subscriber_id: "alice.testnet",
            token_id: "usdc.fakes.testnet",
            epoch: 1,
            amount_usdc: "1.00",
            deposited_balance: "9000000",
            crank_bounty_usdc: "0.05",
            net_merchant_usdc: "0.95",
          },
        };
      case "epoch.settled":
        return {
          id: "evt_01JCH9Y8A4K2L9M1N3P5Q7R9T2",
          type: "epoch.settled",
          chain: "near",
          created: epochSeconds,
          livemode: false,
          data: {
            contract_id: "tidepay-mw1rpoyp.tidepay-e2e-mw1rpm6j.testnet",
            plan_id: "claude-pro",
            subscriber_id: "alice.testnet",
            token_id: "usdc.fakes.testnet",
            epoch: 2,
            amount_usdc: "1.00",
            deposited_balance: "8000000",
            crank_bounty_usdc: "0.05",
            net_merchant_usdc: "0.95",
            tx_hash: "9uSdehPKCX6qFB3YzDzU2fkvVRTQuRrDaQjZrswy813M",
          },
        };
      case "subscription.cancelled":
        return {
          id: "evt_01JCH9Z2F6H8J1K3M5N7P9R2T4",
          type: "subscription.cancelled",
          chain: "near",
          created: epochSeconds,
          livemode: false,
          data: {
            contract_id: "tidepay-mw1rpoyp.tidepay-e2e-mw1rpm6j.testnet",
            plan_id: "claude-pro",
            subscriber_id: "alice.testnet",
            token_id: "usdc.fakes.testnet",
            refunded_prepaid_usdc: "8.00",
          },
        };
    }
  }

  switch (event) {
    case "subscription.created":
      return {
        id: "evt_01JCH9X4M2P8Q7R5V1W3Z6B9N0",
        type: "subscription.created",
        chain: "solana",
        created: epochSeconds,
        livemode: false,
        data: {
          plan_id: "claude-pro",
          plan_address: "4g6EF4q95h1pbVG3Gv7AspaZQ6PujFCYCr3eu63RdC6P",
          subscriber: "BZKYKouLsptzcP9Vb4aABEBEzBFZuPpSxpaDjwPGgQio",
          epoch: 1,
          amount_usdc: "1.00",
          crank_bounty_usdc: "0.05",
          net_merchant_usdc: "0.95",
        },
      };
    case "epoch.settled":
      return {
        id: "evt_01JCH9Y8A4K2L9M1N3P5Q7R9T2",
        type: "epoch.settled",
        chain: "solana",
        created: epochSeconds,
        livemode: false,
        data: {
          plan_id: "claude-pro",
          plan_address: "4g6EF4q95h1pbVG3Gv7AspaZQ6PujFCYCr3eu63RdC6P",
          subscriber: "BZKYKouLsptzcP9Vb4aABEBEzBFZuPpSxpaDjwPGgQio",
          epoch: 2,
          amount_usdc: "1.00",
          crank_bounty_usdc: "0.05",
          net_merchant_usdc: "0.95",
          tx_signature: "4Kc53LoHzLo7SwWneGeR7Fk2eswjrnhe58cKssMNW4rFe55aNacEmbP9",
        },
      };
    case "subscription.cancelled":
      return {
        id: "evt_01JCH9Z2F6H8J1K3M5N7P9R2T4",
        type: "subscription.cancelled",
        chain: "solana",
        created: epochSeconds,
        livemode: false,
        data: {
          plan_id: "claude-pro",
          plan_address: "4g6EF4q95h1pbVG3Gv7AspaZQ6PujFCYCr3eu63RdC6P",
          subscriber: "BZKYKouLsptzcP9Vb4aABEBEzBFZuPpSxpaDjwPGgQio",
          reason: "subscriber_closed",
          rent_refunded_lamports: 1845120,
        },
      };
  }
}

interface PingResult {
  event: EventKey;
  url: string;
  status: number;
  latencyMs: number;
  timestamp: number;
  signaturePreview: string;
}

export function ApiKeyWebhookManager({
  enabledEvents: controlledEvents,
  onEnabledEventsChange,
}: {
  enabledEvents?: EventKey[];
  onEnabledEventsChange?: (next: EventKey[]) => void;
} = {}) {
  const { activeProject, updateActiveProject } = useProject();

  const secretKey = activeProject.secretKey || "";
  const publishableKey = activeProject.publishableKey || "";
  const signingSecret = activeProject.signingSecret || "";
  const savedWebhookUrl = activeProject.webhookUrl || "https://api.yourdomain.com/webhooks/tidepay";

  const [urlDraft, setUrlDraft] = useState(savedWebhookUrl);
  const [urlSaved, setUrlSaved] = useState(false);
  const [revealSecret, setRevealSecret] = useState(false);
  const [revealSigningSecret, setRevealSigningSecret] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [localEvents, setLocalEvents] = useState<EventKey[]>([...WEBHOOK_EVENTS]);
  const enabledEvents = controlledEvents ?? localEvents;
  const setEnabledEvents = onEnabledEventsChange ?? setLocalEvents;

  const [codeTab, setCodeTab] = useState<"payload" | "verify">("payload");
  const [payloadChain, setPayloadChain] = useState<PayloadChain>("solana");
  const [selectedEvent, setSelectedEvent] = useState<EventKey>("subscription.created");
  const [epochNow, setEpochNow] = useState<number>(1763030000);
  const [isPinging, setIsPinging] = useState(false);
  const [pingResult, setPingResult] = useState<PingResult | null>(null);

  useEffect(() => {
    setUrlDraft(savedWebhookUrl);
  }, [savedWebhookUrl]);

  useEffect(() => {
    setEpochNow(Math.floor(Date.now() / 1000));
  }, []);

  const handleSaveUrl = () => {
    const trimmed = urlDraft.trim();
    if (!trimmed) return;
    updateActiveProject({ webhookUrl: trimmed });
    setUrlSaved(true);
    setTimeout(() => setUrlSaved(false), 1800);
  };

  const handleRollApiKey = () => {
    const prefix = activeProject.environment === "live" ? "live" : "dev";
    updateActiveProject({ secretKey: `tp_${prefix}_sec_${generateRandomHex(24)}` });
    setCopiedKey(null);
  };

  const handleRollSigningSecret = () => {
    updateActiveProject({ signingSecret: `whsec_${generateRandomHex(20)}` });
    setCopiedKey(null);
  };

  const toggleEventTrigger = (ev: EventKey) => {
    const next = enabledEvents.includes(ev)
      ? enabledEvents.filter((item) => item !== ev)
      : [...enabledEvents, ev];
    setEnabledEvents(next);
  };

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleSendTestPing = () => {
    const targetUrl = urlDraft.trim() || savedWebhookUrl;
    if (targetUrl !== savedWebhookUrl) {
      updateActiveProject({ webhookUrl: targetUrl });
    }
    setIsPinging(true);
    const start = performance.now();

    setTimeout(() => {
      const latency = Math.max(24, Math.round(performance.now() - start + 42));
      const ts = Math.floor(Date.now() / 1000);
      setIsPinging(false);
      setPingResult({
        event: selectedEvent,
        url: targetUrl,
        status: 200,
        latencyMs: latency,
        timestamp: ts,
        signaturePreview: generateRandomHex(32),
      });

      try {
        const newDelivery = {
          id: `evt_${Date.now().toString(36).toUpperCase()}`,
          event: selectedEvent,
          plan: "claude-pro",
          status: 200,
          statusText: "OK (Simulated)",
          latency: `${latency}ms`,
          timeAgo: "Just now",
        };
        const stored = JSON.parse(localStorage.getItem("tidepay_recent_deliveries") || "[]");
        localStorage.setItem("tidepay_recent_deliveries", JSON.stringify([newDelivery, ...stored.slice(0, 9)]));
        window.dispatchEvent(new Event("tidepay_deliveries_changed"));
      } catch (err) {
        console.error("[TidePay] Failed to save delivery:", err);
      }
    }, 350);
  };

  const payloadJson = JSON.stringify(buildSamplePayload(selectedEvent, payloadChain, epochNow), null, 2);
  const verifySnippet = `import crypto from "node:crypto";

export function verifyTidePaySignature(
  rawBody: string,
  header: string,
  secret = "${signingSecret}"
): boolean {
  const parts = Object.fromEntries(
    header.split(",").map((p) => p.split("="))
  );
  const signedPayload = \`\${parts.t}.\${rawBody}\`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(parts.v1 || ""),
    Buffer.from(expected)
  );
}`;

  const activeCodeText = codeTab === "payload" ? payloadJson : verifySnippet;

  return (
    <div className="grid gap-6 xl:grid-cols-12 items-start">
      {/* Left Column: Credentials & Webhook Configuration */}
      <div className="xl:col-span-7 flex flex-col gap-6">
        {/* API Secret & Publishable Keys */}
        <Card>
          <CardHeader className="flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-success/30 bg-success-soft text-success">
                <Key className="size-4" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-base">API Secret &amp; Publishable Keys</CardTitle>
                <CardDescription className="text-xs">
                  Keys for authenticating server API requests and client Blink widgets.
                </CardDescription>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRollApiKey}
              className="h-8 shrink-0 gap-1.5 text-xs"
            >
              <RefreshCw className="size-3.5" />
              Roll Secret Key
            </Button>
          </CardHeader>

          <CardContent className="flex flex-col gap-3.5">
            {/* Secret Key */}
            <div className="rounded-xl border bg-muted/35 p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-foreground">Secret Key</span>
                  <Badge variant="neutral" className="text-[10px] font-mono">
                    Server-Side Only
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRevealSecret((v) => !v)}
                    className="h-7 gap-1 px-2.5 text-[11px]"
                  >
                    {revealSecret ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                    {revealSecret ? "Hide" : "Reveal"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyText(secretKey, "secret")}
                    className="h-7 gap-1 px-2.5 text-[11px]"
                  >
                    {copiedKey === "secret" ? <Check className="size-3 text-success" /> : <Copy className="size-3" />}
                    {copiedKey === "secret" ? "Copied" : "Copy"}
                  </Button>
                </div>
              </div>
              <code className="mt-2 block break-all select-all font-mono text-xs text-primary">
                {revealSecret ? secretKey : `${secretKey.slice(0, 11)}${"•".repeat(24)}`}
              </code>
            </div>

            {/* Publishable Key */}
            <div className="rounded-xl border bg-muted/35 p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-foreground">Publishable Key</span>
                  <Badge variant="success" className="text-[10px] font-mono">
                    Frontend Client Safe
                  </Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyText(publishableKey, "publishable")}
                  className="h-7 gap-1 px-2.5 text-[11px]"
                >
                  {copiedKey === "publishable" ? <Check className="size-3 text-success" /> : <Copy className="size-3" />}
                  {copiedKey === "publishable" ? "Copied" : "Copy"}
                </Button>
              </div>
              <code className="mt-2 block break-all select-all font-mono text-xs text-foreground/85">
                {publishableKey}
              </code>
            </div>
          </CardContent>
        </Card>

        {/* Webhook Endpoints & Signing Secret */}
        <Card>
          <CardHeader className="flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-success/30 bg-success-soft text-success">
                <Radio className="size-4" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-base">Webhook Endpoints &amp; Signing Secret</CardTitle>
                <CardDescription className="text-xs">
                  Receive real-time HTTP POST notifications when keeper cranks settle epochs.
                </CardDescription>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRollSigningSecret}
              className="h-8 shrink-0 gap-1.5 text-xs"
            >
              <RefreshCw className="size-3.5" />
              Roll Signing Secret
            </Button>
          </CardHeader>

          <CardContent className="flex flex-col gap-5">
            {/* Endpoint URL */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="webhook-endpoint-url" className="font-medium text-foreground">
                  Endpoint Destination URL
                </label>
                <span className="text-[11px] text-muted-foreground">Receives HTTP POST</span>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1 min-w-0">
                  <Globe className="pointer-events-none absolute left-3 top-3 size-3.5 text-muted-foreground" />
                  <Input
                    id="webhook-endpoint-url"
                    value={urlDraft}
                    onChange={(e) => setUrlDraft(e.target.value)}
                    placeholder="https://api.yourdomain.com/webhooks/tidepay"
                    className="h-9.5 pl-8 font-mono text-xs"
                  />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSaveUrl}
                    disabled={!urlDraft.trim() || urlDraft.trim() === savedWebhookUrl}
                    className="h-9.5 px-3 text-xs"
                  >
                    {urlSaved ? "Saved" : "Save"}
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSendTestPing}
                    disabled={isPinging}
                    className="h-9.5 gap-1.5 px-3.5 text-xs font-semibold"
                  >
                    <Send className={cn("size-3.5", isPinging && "animate-pulse")} />
                    {isPinging ? "Sending…" : "Send Test Ping"}
                  </Button>
                </div>
              </div>
            </div>

            {/* Subscribed Events Checkboxes */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">Subscribed Events</span>
                <span className="text-[11px] text-muted-foreground">Toggle active triggers</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                {WEBHOOK_EVENTS.map((ev) => {
                  const checked = enabledEvents.includes(ev);
                  return (
                    <button
                      key={ev}
                      type="button"
                      role="checkbox"
                      aria-checked={checked}
                      onClick={() => toggleEventTrigger(ev)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border px-3 py-2 text-left font-mono text-[11px] transition-colors",
                        checked
                          ? "border-success/40 bg-success-soft/60 text-foreground"
                          : "border-border bg-muted/25 text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
                          checked
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background",
                        )}
                      >
                        {checked && <Check className="size-3 stroke-[3]" />}
                      </span>
                      <span className="truncate">{ev}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Webhook Signing Secret */}
            <div className="rounded-xl border bg-muted/35 p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-foreground">Webhook Signing Secret</span>
                  <Badge variant="success" className="text-[10px] font-mono">
                    HMAC-SHA256
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRevealSigningSecret((v) => !v)}
                    className="h-7 gap-1 px-2.5 text-[11px]"
                  >
                    {revealSigningSecret ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                    {revealSigningSecret ? "Hide" : "Reveal"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyText(signingSecret, "whsec")}
                    className="h-7 gap-1 px-2.5 text-[11px]"
                  >
                    {copiedKey === "whsec" ? <Check className="size-3 text-success" /> : <Copy className="size-3" />}
                    {copiedKey === "whsec" ? "Copied" : "Copy"}
                  </Button>
                </div>
              </div>
              <code className="mt-2 block break-all select-all font-mono text-xs text-primary">
                {revealSigningSecret ? signingSecret : `${signingSecret.slice(0, 8)}${"•".repeat(20)}`}
              </code>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Column: Payload / Verify Viewer & Live Test Ping Console */}
      <div className="xl:col-span-5 flex flex-col gap-6">
        {/* Payload JSON / Verify Signature Viewer */}
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
            <div className="inline-flex items-center gap-1 rounded-lg border bg-muted/50 p-0.5">
              <button
                type="button"
                onClick={() => setCodeTab("payload")}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  codeTab === "payload"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Payload JSON
              </button>
              <button
                type="button"
                onClick={() => setCodeTab("verify")}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  codeTab === "verify"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Verify Signature (TS)
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => copyText(activeCodeText, "code")}
              className="h-7 gap-1 px-2.5 text-[11px]"
            >
              {copiedKey === "code" ? <Check className="size-3 text-success" /> : <Copy className="size-3" />}
              {copiedKey === "code" ? "Copied" : codeTab === "payload" ? "Copy JSON" : "Copy TS"}
            </Button>
          </div>

          {codeTab === "payload" && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/20 px-4 py-2.5">
              <div className="flex flex-wrap items-center gap-1.5">
                {WEBHOOK_EVENTS.map((ev) => (
                  <button
                    key={ev}
                    type="button"
                    onClick={() => setSelectedEvent(ev)}
                    className={cn(
                      "rounded-md border px-2.5 py-1 font-mono text-[11px] transition-colors",
                      selectedEvent === ev
                        ? "border-success/40 bg-success-soft text-success font-medium"
                        : "border-border bg-background/60 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {ev}
                  </button>
                ))}
              </div>
              <div className="inline-flex items-center gap-0.5 rounded-md border bg-muted/50 p-0.5">
                {(["solana", "near"] as PayloadChain[]).map((chain) => (
                  <button
                    key={chain}
                    type="button"
                    onClick={() => setPayloadChain(chain)}
                    className={cn(
                      "rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors",
                      payloadChain === chain
                        ? "bg-card text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {chain}
                  </button>
                ))}
              </div>
            </div>
          )}

          <pre className="max-h-96 overflow-auto bg-muted/35 p-4 font-mono text-[11.5px] leading-relaxed text-foreground/90">
            <code>{activeCodeText}</code>
          </pre>
        </Card>

        {/* Live Test Ping Console */}
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <Terminal className="size-4 text-muted-foreground" />
              <h3 className="text-xs font-semibold text-foreground">Live Test Ping Console</h3>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge variant={pingResult ? "success" : "neutral"} className="font-mono text-[10px]">
                {pingResult ? `${pingResult.status} OK` : "Simulated"}
              </Badge>
              <Badge variant="outline" className="font-mono text-[10px]">
                5s Timeout
              </Badge>
            </div>
          </div>

          <CardContent className="p-4">
            {pingResult ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 rounded-lg border border-success/30 bg-success-soft/50 px-3 py-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant="success" className="font-mono text-[10px] shrink-0">
                      {pingResult.status} OK · {pingResult.latencyMs}ms
                    </Badge>
                    <span className="truncate font-mono text-foreground">{pingResult.event}</span>
                  </div>
                  <span className="shrink-0 text-[11px] text-muted-foreground">Just now</span>
                </div>

                <div className="rounded-lg border bg-muted/35 p-3 font-mono text-[11px] leading-relaxed">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Request Headers
                  </div>
                  <div className="mt-1.5 space-y-0.5 text-foreground/85 break-all">
                    <div>POST {pingResult.url}</div>
                    <div className="text-muted-foreground">
                      X-TidePay-Signature: t={pingResult.timestamp},v1={pingResult.signaturePreview}
                    </div>
                    <div className="text-muted-foreground">Content-Type: application/json</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed bg-muted/20 p-5 text-center text-xs text-muted-foreground">
                Click <span className="font-medium text-foreground">Send Test Ping</span> to dispatch a signed{" "}
                <code className="font-mono text-foreground">{selectedEvent}</code> payload to your endpoint URL and inspect the headers here.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
