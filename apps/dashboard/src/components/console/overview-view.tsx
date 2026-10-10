"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  DollarSign,
  Users,
  ShieldCheck,
  Wallet,
  RefreshCw,
  Plus,
  ArrowUpRight,
  Zap,
  ExternalLink,
} from "lucide-react";
import { useConnection } from "@solana/wallet-adapter-react";
import { MerchantGate } from "@/components/console/merchant-gate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DEFAULT_CRANK_BOUNTY_USDC,
  explorerUrl,
  checkoutUrl,
  blinkUrl,
} from "@/lib/chain/config";
import {
  fetchAllMerchantPlansActivity,
  type PlanOnChainEvent,
} from "@/lib/chain/accounts";
import {
  intervalUnit,
  type MerchantData,
  type PlanSummary,
  type SubscriberRow,
  type CrankStatusRow,
} from "@/lib/types";
import { cn } from "@/lib/utils";

export function OverviewView() {
  return (
    <MerchantGate>
      {(data, { refresh, isRefreshing, lastRefreshedAt }) => (
        <OverviewContent
          plans={data.plans}
          subscribers={data.subscribers}
          crank={data.crank}
          onRefresh={refresh}
          isRefreshing={isRefreshing}
          lastRefreshedAt={lastRefreshedAt}
        />
      )}
    </MerchantGate>
  );
}

function OverviewContent({
  plans,
  subscribers,
  crank,
  onRefresh,
  isRefreshing,
  lastRefreshedAt,
}: {
  plans: PlanSummary[];
  subscribers: SubscriberRow[];
  crank: CrankStatusRow[];
  onRefresh: () => void;
  isRefreshing: boolean;
  lastRefreshedAt: number | null;
}) {
  const { connection } = useConnection();
  const [onChainEvents, setOnChainEvents] = useState<PlanOnChainEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  useEffect(() => {
    if (plans.length === 0) return;
    setLoadingEvents(true);
    fetchAllMerchantPlansActivity(
      connection,
      plans.map((p) => ({ id: p.id, name: p.name, priceUsdc: p.priceUsdc })),
      DEFAULT_CRANK_BOUNTY_USDC,
      15,
    )
      .then(setOnChainEvents)
      .finally(() => setLoadingEvents(false));
  }, [connection, plans, lastRefreshedAt]);

  // Active vs Past Subscribers across all plans
  const activeSubscribers = subscribers.filter((s) => s.status === "Active");
  const pastDueSubscribers = subscribers.filter((s) => s.status === "PastDue");
  const activeCount = activeSubscribers.length;

  // Deduplicate all-time unique subscribers across current records and on-chain events
  const allTimeWallets = new Set<string>();
  for (const s of subscribers) {
    if (s.wallet) allTimeWallets.add(s.wallet);
  }
  for (const e of onChainEvents) {
    if (e.subscriber) allTimeWallets.add(e.subscriber);
  }
  const allTimeCount = Math.max(allTimeWallets.size, subscribers.length);
  const pastCount = Math.max(0, allTimeCount - activeCount);

  // Cross-plan Normalized 30-day MRR
  const totalMrr = plans
    .reduce((sum, p) => {
      const planActiveCount = subscribers.filter(
        (s) => (s.plan === p.id || s.plan === p.name) && s.status === "Active",
      ).length;
      const cycleSec = p.intervalSeconds || 2_592_000;
      const price = parseFloat(p.priceUsdc) || 0;
      return sum + (price * planActiveCount * 2_592_000) / cycleSec;
    }, 0)
    .toFixed(2);

  // Cumulative Settled Net & Gross Earnings
  const paidEvents = onChainEvents.filter(
    (e) => e.kind === "settled" || e.kind === "subscribed",
  );
  const totalSettlementsCount = paidEvents.length;

  const totalEarnedNetNum = paidEvents.reduce((sum, e) => {
    const netVal = parseFloat(e.amountNetUsdc?.replace("+", "") || "0") || 0;
    return sum + netVal;
  }, 0);
  const totalEarnedNetUsdc = totalEarnedNetNum.toFixed(2);

  const totalGrossBilledNum = paidEvents.reduce((sum, e) => {
    const grossVal = parseFloat(e.amountGrossUsdc || "0") || 0;
    return sum + grossVal;
  }, 0);
  const totalGrossBilledUsdc = totalGrossBilledNum.toFixed(2);

  // Renewal Success Rate
  const totalEvaluated = activeCount + pastDueSubscribers.length;
  const hasHistory = totalEvaluated > 0 || totalSettlementsCount > 0;
  const renewalSuccessRate = hasHistory
    ? pastDueSubscribers.length === 0
      ? "100%"
      : `${((activeCount / totalEvaluated) * 100).toFixed(0)}%`
    : "—";

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Overview</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time subscriber and billing analytics across all your TidePay plans.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-2.5 py-1 text-[11px] text-muted-foreground font-mono">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Auto-sync 20s
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRefresh()}
            disabled={isRefreshing}
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={cn("size-3.5", isRefreshing && "animate-spin")} />
            {isRefreshing ? "Syncing…" : "Refresh"}
          </Button>
          <Button asChild size="sm" className="gap-1.5">
            <Link href="/plans/new">
              <Plus className="size-3.5" />
              Create Plan
            </Link>
          </Button>
        </div>
      </div>

      {/* Stripe-grade 4-Card KPI Performance Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Total Earned (Net)</span>
            <Wallet className="size-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-foreground tabular-nums">
            +{totalEarnedNetUsdc} USDC
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {totalSettlementsCount > 0
              ? `${totalGrossBilledUsdc} USDC gross across ${totalSettlementsCount} settlements`
              : "Across 0 on-chain settlements"}
          </p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Monthly Revenue (MRR)</span>
            <DollarSign className="size-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-foreground tabular-nums">
            {totalMrr} USDC
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {activeCount > 0
              ? `Normalized across ${activeCount} active subscriber(s)`
              : totalSettlementsCount > 0
                ? `0 active · +${totalEarnedNetUsdc} USDC earned to date`
                : "Normalized across 0 subscriber(s)"}
          </p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Active Subscribers</span>
            <Users className="size-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-foreground tabular-nums">
            {activeCount}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {allTimeCount > 0
              ? `${allTimeCount} total all-time (${activeCount} active, ${pastCount} past)`
              : "Ready for subscriptions"}
          </p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Renewal Success Rate</span>
            <ShieldCheck className="size-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-foreground tabular-nums">
            {renewalSuccessRate}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {!hasHistory
              ? "No renewal attempts yet"
              : pastDueSubscribers.length === 0
                ? "100% on-chain settlements"
                : `${pastDueSubscribers.length} renewal(s) past due`}
          </p>
        </Card>
      </div>

      {/* Plans Performance Breakdown Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <CardTitle className="text-base">Plans Performance</CardTitle>
              <Badge variant="outline" className="tabular-nums">
                {plans.length} plan{plans.length === 1 ? "" : "s"}
              </Badge>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-xs text-primary hover:underline -mr-2">
              <Link href="/plans">Manage all plans →</Link>
            </Button>
          </div>
          <CardDescription>All recurring subscription plans deployed from this merchant wallet.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {plans.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No plans created yet. Click &quot;Create Plan&quot; above to launch your first recurring billing plan!
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-t-0 hover:bg-transparent">
                  <TableHead>Plan</TableHead>
                  <TableHead>Terms</TableHead>
                  <TableHead>Subscribers</TableHead>
                  <TableHead>Net Earned</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((p) => {
                  const planActiveSubs = subscribers.filter(
                    (s) => (s.plan === p.id || s.plan === p.name) && s.status === "Active",
                  ).length;
                  const planEvents = onChainEvents.filter(
                    (e) => e.planName === p.name || e.planAddress === p.id,
                  );
                  const planPaidEvents = planEvents.filter(
                    (e) => e.kind === "settled" || e.kind === "subscribed",
                  );
                  const planEarnedNet = planPaidEvents
                    .reduce((sum, e) => sum + (parseFloat(e.amountNetUsdc?.replace("+", "") || "0") || 0), 0)
                    .toFixed(2);

                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs font-semibold text-foreground">
                        <Link href={`/plans/${encodeURIComponent(p.name || p.id)}`} className="hover:text-primary hover:underline">
                          {p.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {p.priceUsdc} USDC / {intervalUnit(p.intervalSeconds)}
                      </TableCell>
                      <TableCell className="text-xs">
                        <span className="font-semibold text-foreground">{planActiveSubs} active</span>
                        {planPaidEvents.length > 0 && (
                          <span className="text-muted-foreground text-[11px] ml-1.5">
                            ({planPaidEvents.length} pull{planPaidEvents.length === 1 ? "" : "s"})
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs font-semibold text-primary">
                        +{planEarnedNet} USDC
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.active ? "success" : "neutral"}>
                          {p.active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button asChild variant="outline" size="sm" className="h-7 px-2 text-xs gap-1">
                            <a href={checkoutUrl(p.id)} target="_blank" rel="noreferrer">
                              Checkout
                              <ExternalLink className="size-3" />
                            </a>
                          </Button>
                          <Button asChild variant="outline" size="sm" className="h-7 px-2 text-xs gap-1">
                            <a href={blinkUrl(p.id)} target="_blank" rel="noreferrer">
                              Blink
                              <Zap className="size-3" />
                            </a>
                          </Button>
                          <Button asChild size="sm" className="h-7 px-2.5 text-xs">
                            <Link href={`/plans/${encodeURIComponent(p.name || p.id)}`}>
                              Details
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Two-Column Layout: Cross-Plan Activity + Keeper Crank Info */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Recent Billing Settlements across All Plans */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CardTitle className="text-base">Recent Settlements & Activity</CardTitle>
                  <Badge variant="outline" className="tabular-nums">
                    {onChainEvents.length} on-chain
                  </Badge>
                </div>
                <Button asChild variant="ghost" size="sm" className="text-xs text-primary hover:underline -mr-2">
                  <Link href="/subscribers">View subscribers →</Link>
                </Button>
              </div>
              <CardDescription>
                Live on-chain subscription events and keeper crank renewals across all plans.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {onChainEvents.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  {loadingEvents ? "Loading on-chain events from Solana Devnet…" : "No on-chain activity yet."}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-t-0 hover:bg-transparent">
                      <TableHead>Event</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Amount (Net)</TableHead>
                      <TableHead className="text-right">Transaction</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {onChainEvents.slice(0, 10).map((event) => (
                      <TableRow key={event.signature}>
                        <TableCell className="font-medium text-xs">
                          <Badge
                            variant={
                              event.kind === "settled"
                                ? "success"
                                : event.kind === "subscribed"
                                  ? "outline"
                                  : "neutral"
                            }
                          >
                            {event.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-foreground/80">
                          {event.planName ? (
                            <Link href={`/plans/${encodeURIComponent(event.planName)}`} className="hover:text-primary hover:underline">
                              {event.planName}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{event.timeFormatted}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {event.amountNetUsdc ? (
                            <div className="flex flex-col items-start gap-0.5">
                              <span className="font-semibold text-primary">
                                {event.amountNetUsdc} USDC <span className="text-[10px] text-muted-foreground font-normal">net</span>
                              </span>
                              <span className="text-[10px] text-muted-foreground font-normal">
                                {event.amountGrossUsdc} billed · -{event.keeperFeeUsdc} crank
                              </span>
                            </div>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <a
                            href={explorerUrl("tx", event.signature)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline"
                          >
                            {event.signature.slice(0, 6)}...{event.signature.slice(-4)}
                            <ArrowUpRight className="size-3" />
                          </a>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Keeper Crank Status & Quick Info */}
        <div className="flex flex-col gap-6 lg:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Keeper Crank Status</CardTitle>
              <CardDescription>Decentralized crank workers settling renewals.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col divide-y text-sm">
              {crank.map((row) => (
                <div key={row.label} className="flex items-center justify-between py-2.5">
                  <span className="text-xs text-muted-foreground">{row.label}</span>
                  <span className="font-mono text-xs font-medium text-foreground">{row.value}</span>
                </div>
              ))}
              <div className="flex items-center justify-between py-2.5">
                <span className="text-xs text-muted-foreground">Network</span>
                <span className="text-xs font-semibold text-primary">Solana Devnet</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Actions</CardTitle>
              <CardDescription>Distribute subscriptions and integrate TidePay.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2.5 text-sm">
              <Button asChild variant="outline" className="justify-start gap-2">
                <Link href="/plans/new">
                  <Plus className="size-4" />
                  Create New Plan
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start gap-2">
                <Link href="/developers">
                  <Zap className="size-4" />
                  View Developer SDK & Blinks
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start gap-2">
                <Link href="/subscribers">
                  <Users className="size-4" />
                  Manage Subscribers
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
