"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Check,
  Copy,
  ExternalLink,
  Layers,
  Radio,
  RefreshCw,
  Server,
} from "lucide-react";
import { MerchantGate } from "@/components/console/merchant-gate";
import {
  ApiKeyWebhookManager,
  WEBHOOK_EVENTS,
  type EventKey,
} from "@/components/developers/api-key-webhook-manager";
import { useProject } from "@/components/project-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TIDEPAY_PROGRAM_ID } from "@tidepay/types";
import { API_URL, getRpcUrl } from "@/lib/chain/config";
import { shortAddress } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface WebhookDelivery {
  id: string;
  event: string;
  plan: string;
  status: number;
  statusText: string;
  latency: string;
  timeAgo: string;
}

function summarizeHost(url: string, fallback: string): string {
  try {
    const parsed = new URL(url);
    return parsed.host || fallback;
  } catch {
    return fallback;
  }
}

export function WebhooksView() {
  return (
    <MerchantGate>
      {(_data, { refresh, isRefreshing }) => (
        <WebhooksContent onRefresh={refresh} isRefreshing={isRefreshing} />
      )}
    </MerchantGate>
  );
}

function WebhooksContent({
  onRefresh,
  isRefreshing,
}: {
  onRefresh: () => void;
  isRefreshing: boolean;
}) {
  const { activeProject } = useProject();
  const [copiedEndpoint, setCopiedEndpoint] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [enabledEvents, setEnabledEvents] = useState<EventKey[]>([...WEBHOOK_EVENTS]);

  useEffect(() => {
    const loadDeliveries = () => {
      try {
        const stored = localStorage.getItem("tidepay_recent_deliveries");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) setDeliveries(parsed);
        }
      } catch (err) {
        console.error("[TidePay] Failed to load deliveries:", err);
      }
    };

    loadDeliveries();
    window.addEventListener("tidepay_deliveries_changed", loadDeliveries);
    return () => window.removeEventListener("tidepay_deliveries_changed", loadDeliveries);
  }, []);

  const copyUrl = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedEndpoint(id);
    setTimeout(() => setCopiedEndpoint(null), 1800);
  };

  const isLive = activeProject.environment === "live";
  const apiHost = summarizeHost(API_URL, "localhost:3001");
  const rpcUrl = getRpcUrl(activeProject.environment, activeProject);
  const rpcLabel = rpcUrl.includes("helius") ? "Helius RPC" : summarizeHost(rpcUrl, "Solana RPC");
  const shortEventNames = enabledEvents.map((e) => e.split(".")[1] ?? e).join(" · ") || "none selected";
  const hasDeliveries = deliveries.length > 0;
  const successRatePct = hasDeliveries
    ? Math.round((deliveries.filter((d) => d.status >= 200 && d.status < 300).length / deliveries.length) * 100)
    : null;

  const API_ENDPOINTS = [
    {
      method: "POST",
      path: "/api/v1/checkout/sessions",
      url: `${API_URL}/api/v1/checkout/sessions`,
      desc: "Creates a pre-configured checkout URL with client reference metadata",
    },
    {
      method: "GET",
      path: "/api/v1/subscriptions/:wallet?plan=:planAddress",
      url: `${API_URL}/api/v1/subscriptions/WALLET_ADDRESS?plan=PLAN_ADDRESS`,
      desc: "Queries real-time on-chain subscription and active entitlement status",
    },
    {
      method: "POST",
      path: "/api/v1/subscriptions/cancel",
      url: `${API_URL}/api/v1/subscriptions/cancel`,
      desc: "Prepares cancellation transaction and refunds closed account rent to subscriber",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-0.5">
          <p className="text-sm text-muted-foreground">
            Configure server-side credentials and register automated event listeners for recurring renewals.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="hidden md:inline font-mono text-xs text-muted-foreground">
            Anchor Program {shortAddress(TIDEPAY_PROGRAM_ID, 4)}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={cn("size-3.5", isRefreshing && "animate-spin")} />
            {isRefreshing ? "Syncing…" : "Refresh"}
          </Button>
          <Button asChild size="sm" variant="outline" className="gap-1.5 text-xs">
            <Link href="/developers?topic=api-rest">
              Full API Docs
              <ExternalLink className="size-3" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Top 3 KPI Status Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Webhook Status</span>
            <Radio className="size-4 text-success" />
          </div>
          <div className="mt-2.5 flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
            <span className="size-2 rounded-full bg-success" aria-hidden="true" />
            {enabledEvents.length > 0 ? "Active" : "Paused"}
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Listening for on-chain crank renewals
          </p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Subscribed Events</span>
            <Layers className="size-4 text-primary" />
          </div>
          <div className="mt-2.5 text-2xl font-bold tracking-tight text-foreground tabular-nums">
            {enabledEvents.length} Event Type{enabledEvents.length === 1 ? "" : "s"}
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground font-mono">
            {shortEventNames}
          </p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">REST API Gateway</span>
            <Server className="size-4 text-primary" />
          </div>
          <div className="mt-2.5 flex items-center gap-2.5">
            <span className="text-2xl font-bold tracking-tight text-foreground">
              {isLive ? "Mainnet v1" : "Devnet v1"}
            </span>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {apiHost} · {rpcLabel}
          </p>
        </Card>
      </div>

      {/* Interactive 2-Column API Keys & Webhook Workbench */}
      <ApiKeyWebhookManager
        enabledEvents={enabledEvents}
        onEnabledEventsChange={setEnabledEvents}
      />

      {/* Recent Deliveries Table */}
      <Card>
        <CardHeader className="flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <CardTitle className="text-base">Recent Webhook Deliveries</CardTitle>
            <CardDescription className="text-xs">
              Log of events dispatched to your configured endpoint destination.
            </CardDescription>
          </div>
          {successRatePct !== null && (
            <Badge variant="success" className="font-mono text-[11px] shrink-0">
              {successRatePct}% Delivery Success
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          {deliveries.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/20 p-8 text-center">
              <Server className="size-7 text-muted-foreground/60" />
              <div className="text-xs font-semibold text-foreground">No Webhook Deliveries Logged Yet</div>
              <p className="max-w-sm text-[11px] text-muted-foreground">
                Click &quot;Send Test Ping&quot; above to inspect simulated delivery logs, or receive automated events on renewal.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table className="min-w-160 text-xs">
                <TableHeader>
                  <TableRow className="border-t-0 bg-muted/40 hover:bg-muted/40">
                    <TableHead className="w-44">Event ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Latency</TableHead>
                    <TableHead className="text-right">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deliveries.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-mono text-[11px] text-muted-foreground">{d.id}</TableCell>
                      <TableCell className="font-mono font-medium">
                        <span className="rounded border border-success/30 bg-success-soft px-2 py-0.5 text-[11px] text-success">
                          {d.event}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-muted-foreground">{d.plan}</TableCell>
                      <TableCell>
                        <Badge variant="success" className="text-[10px]">
                          {d.status} {d.statusText}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-[11px] text-muted-foreground">{d.latency}</TableCell>
                      <TableCell className="text-right text-[11px] text-muted-foreground">{d.timeAgo}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* REST API Endpoints Reference Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Available REST API Endpoints</CardTitle>
          <CardDescription className="text-xs">
            Server-to-server endpoints ready for integration.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {API_ENDPOINTS.map((ep) => (
            <div
              key={ep.path}
              className="flex flex-col justify-between gap-2 rounded-lg border bg-muted/25 p-3 sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-primary/15 px-2 py-0.5 font-mono text-[11px] font-bold text-primary">
                    {ep.method}
                  </span>
                  <code className="truncate font-mono text-xs font-semibold text-foreground">{ep.path}</code>
                </div>
                <p className="text-[11px] text-muted-foreground">{ep.desc}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyUrl(ep.url, ep.path)}
                className="h-7 shrink-0 self-start gap-1 px-2.5 text-xs sm:self-auto"
              >
                {copiedEndpoint === ep.path ? <Check className="size-3 text-success" /> : <Copy className="size-3" />}
                {copiedEndpoint === ep.path ? "Copied" : "Copy URL"}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
