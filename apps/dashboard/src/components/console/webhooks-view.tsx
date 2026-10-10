"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Webhook,
  Key,
  ExternalLink,
  ShieldCheck,
  Radio,
  Send,
  RefreshCw,
  Server,
  Layers,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MerchantGate } from "@/components/console/merchant-gate";
import { ApiKeyWebhookManager } from "@/components/developers/api-key-webhook-manager";
import { API_URL } from "@/lib/chain/config";

export interface WebhookDelivery {
  id: string;
  event: string;
  plan: string;
  status: number;
  statusText: string;
  latency: string;
  timeAgo: string;
}

export function WebhooksView() {
  return (
    <MerchantGate>
      {(data, { refresh, isRefreshing }) => (
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
  const [copiedEndpoint, setCopiedEndpoint] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);

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
    setTimeout(() => setCopiedEndpoint(null), 2000);
  };

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
      desc: "Prepares cancellation transaction and refunds ~0.0015 SOL rent lamports to subscriber",
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            Configure server-side credentials and register automated event listeners for recurring renewals.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="size-3.5" />
            {isRefreshing ? "Syncing…" : "Refresh"}
          </Button>

          <Button asChild size="sm" variant="default" className="gap-1.5 text-xs">
            <Link href="/developers?topic=api-rest">
              Full API Docs
              <ExternalLink className="size-3" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Top 3 KPI Status Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4 border-border/60 bg-card/50">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Webhook Status</span>
            <Radio className="size-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
            Active
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Listening for on-chain crank renewals
          </p>
        </Card>

        <Card className="p-4 border-border/60 bg-card/50">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Subscribed Events</span>
            <Layers className="size-4 text-primary" />
          </div>
          <div className="mt-2 text-xl font-bold tracking-tight text-foreground">
            3 Event Types
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            created · settled · cancelled
          </p>
        </Card>

        <Card className="p-4 border-border/60 bg-card/50">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">REST API Gateway</span>
            <Server className="size-4 text-primary" />
          </div>
          <div className="mt-2 text-xl font-bold tracking-tight text-foreground">
            Devnet v1
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Port 3001 · Helius RPC Cluster
          </p>
        </Card>
      </div>

      {/* Interactive API Keys & Webhook Config Component */}
      <ApiKeyWebhookManager />

      {/* Recent Deliveries Table */}
      <Card className="border-border/70 bg-card/50">
        <CardHeader className="flex-row items-center justify-between gap-4">
          <div className="min-w-0">
            <CardTitle className="text-base font-bold">Recent Webhook Deliveries</CardTitle>
            <CardDescription className="text-xs">
              Log of automated events dispatched to your registered server endpoint.
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-[11px] font-mono border-emerald-500/40 text-emerald-400 shrink-0 ml-auto">
            100% Delivery Success
          </Badge>
        </CardHeader>
        <CardContent>
          {deliveries.length === 0 ? (
            <div className="rounded-lg border border-border/50 bg-background/30 p-8 text-center flex flex-col items-center justify-center gap-2">
              <Server className="size-8 text-muted-foreground/60" />
              <div className="font-semibold text-xs text-foreground">No Webhook Deliveries Logged Yet</div>
              <p className="text-[11px] text-muted-foreground max-w-sm">
                When your server endpoint receives automated events or you click &quot;Send Test Ping&quot; above, real delivery records will appear here.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-border/60 overflow-x-auto">
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
                    <TableRow key={d.id} className="hover:bg-accent/40">
                      <TableCell className="font-mono text-[11px] text-muted-foreground">
                        {d.id}
                      </TableCell>
                      <TableCell className="font-mono font-medium text-foreground">
                        <span className="rounded bg-primary/10 border border-primary/20 px-2 py-0.5 text-primary text-[11px]">
                          {d.event}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-muted-foreground">{d.plan}</TableCell>
                      <TableCell>
                        <Badge variant="success" className="text-[10px]">
                          {d.status} {d.statusText}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-muted-foreground text-[11px]">{d.latency}</TableCell>
                      <TableCell className="text-right text-muted-foreground text-[11px]">{d.timeAgo}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* REST API Endpoints Reference Card */}
      <Card className="border-border/70 bg-card/50">
        <CardHeader>
          <CardTitle className="text-base font-bold">Available REST API Endpoints</CardTitle>
          <CardDescription className="text-xs">
            Server-to-server endpoints ready for immediate integration.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {API_ENDPOINTS.map((ep) => (
            <div key={ep.path} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border border-border/50 bg-background/50 p-3">
              <div className="flex flex-col gap-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-primary/15 px-2 py-0.5 font-mono text-[11px] font-bold text-primary">
                    {ep.method}
                  </span>
                  <code className="font-mono text-xs text-foreground font-semibold truncate">
                    {ep.path}
                  </code>
                </div>
                <p className="text-[11px] text-muted-foreground">{ep.desc}</p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyUrl(ep.url, ep.path)}
                  className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                >
                  {copiedEndpoint === ep.path ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                  <span>{copiedEndpoint === ep.path ? "Copied" : "Copy URL"}</span>
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
