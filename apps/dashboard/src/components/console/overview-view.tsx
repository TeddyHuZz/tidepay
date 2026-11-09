"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { RefreshCw, Plus, ArrowUpRight, ExternalLink } from "lucide-react";
import { useConnection } from "@solana/wallet-adapter-react";
import { MerchantGate } from "@/components/console/merchant-gate";
import { Badge } from "@/components/ui/badge";
import { isNearPlanId } from "@/lib/near/ids";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShareBlinkButton } from "@/components/console/share-blink-button";
import {
  DEFAULT_CRANK_BOUNTY_USDC,
  explorerUrl,
  planLinks,
} from "@/lib/chain/config";
import { nearExplorerUrl } from "@/lib/near/config";
import {
  DEFAULT_ACTIVITY_LIMIT,
  fetchAllMerchantPlansActivity,
  fetchDatabaseSettlements,
  type DatabaseSettlementsResult,
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
  plans: allPlans,
  subscribers: allSubscribers,
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
  const [chain, setChain] = useState<"solana" | "near">("solana");
  const isNear = chain === "near";
  const [rawEvents, setOnChainEvents] = useState<PlanOnChainEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [rawDbSummary, setDbSummary] = useState<DatabaseSettlementsResult["summary"] | null>(null);
  const [dbByPlan, setDbByPlan] = useState<DatabaseSettlementsResult["byPlan"]>({});

  // NEAR plans have no Solana accounts; keep them out of every Solana fetch.
  const solanaPlans = useMemo(() => allPlans.filter((p) => !isNearPlanId(p.id)), [allPlans]);

  // Chain tab scopes every stat below.
  const plans = useMemo(() => allPlans.filter((p) => isNearPlanId(p.id) === isNear), [allPlans, isNear]);
  const subscribers = useMemo(
    () => allSubscribers.filter((s) => (s.network === "near") === isNear),
    [allSubscribers, isNear],
  );

  const nearEvents: PlanOnChainEvent[] = useMemo(() => {
    if (!isNear) return [];
    return subscribers
      .filter((s) => (s.cycleCount ?? 0) > 0 && s.lastBilledAt)
      .map((s) => {
        const p = plans.find((pl) => pl.id === s.plan || pl.name === s.plan);
        const gross = p ? parseFloat(p.priceUsdc) || 0 : 0;
        const net = Math.max(0, gross * 0.995 - 0.05).toFixed(2);
        const at = s.lastBilledAt ? new Date(s.lastBilledAt).getTime() : Date.now();
        return {
          signature: s.id,
          kind: ((s.cycleCount ?? 0) > 1 ? "settled" : "subscribed") as "settled" | "subscribed",
          label: (s.cycleCount ?? 0) > 1 ? "Subscription Renewal" : "New Subscription",
          timestamp: at,
          timeFormatted: new Date(at).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
          err: false,
          amountGrossUsdc: gross.toFixed(2),
          amountNetUsdc: net,
          keeperFeeUsdc: "0.05",
          subscriber: s.wallet,
          planName: p?.name || s.plan,
          planAddress: s.plan,
        };
      });
  }, [isNear, subscribers, plans]);

  const onChainEvents = isNear ? nearEvents : rawEvents;
  const dbSummary = isNear ? null : rawDbSummary;

  const nearCrank: CrankStatusRow[] = useMemo(() => {
    const pastDue = subscribers.filter((s) => s.status === "PastDue").length;
    const activeWithNext = subscribers
      .filter((s) => s.status === "Active" && s.nextDueAt)
      .map((s) => new Date(s.nextDueAt).getTime())
      .filter((t) => !isNaN(t) && t > 0)
      .sort((a, b) => a - b);
    const billed = subscribers
      .filter((s) => s.lastBilledAt)
      .map((s) => new Date(s.lastBilledAt).getTime())
      .filter((t) => !isNaN(t) && t > 0)
      .sort((a, b) => b - a);

    const nextDueStr = activeWithNext[0]
      ? new Date(activeWithNext[0]).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
      : "—";
    const lastPullStr = billed[0]
      ? new Date(billed[0]).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
      : "—";

    return [
      { label: "Last pull", value: lastPullStr },
      { label: "Next due", value: nextDueStr },
      { label: "Pending epochs", value: String(pastDue) },
    ];
  }, [subscribers]);

  const crankRows = isNear ? nearCrank : crank;

  useEffect(() => {
    if (solanaPlans.length === 0) return;
    setLoadingEvents(true);

    // Primary: Instant 5ms query from Neon Postgres indexer
    const planAddrs = solanaPlans.map((p) => p.id);
    fetchDatabaseSettlements(planAddrs).then((res) => {
      if (res) {
        setDbSummary(res.summary);
        setDbByPlan(res.byPlan);
        if (res.events && res.events.length > 0) {
          setOnChainEvents((prev) => (prev.length === 0 ? res.events : prev));
        }
      }
    });

    // Fallback & continuous background sync with on-chain Solana state
    fetchAllMerchantPlansActivity(
      connection,
      solanaPlans.map((p) => ({ id: p.id, name: p.name, priceUsdc: p.priceUsdc })),
      DEFAULT_CRANK_BOUNTY_USDC,
      DEFAULT_ACTIVITY_LIMIT,
    )
      .then(setOnChainEvents)
      .finally(() => setLoadingEvents(false));
  }, [connection, solanaPlans, lastRefreshedAt]);

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

  // Cumulative Settled Net & Gross Earnings (Database Indexer with on-chain RPC fallback)
  const paidEvents = onChainEvents.filter(
    (e) => e.kind === "settled" || e.kind === "subscribed",
  );
  const rpcSettlementsCount = paidEvents.length;
  const totalSettlementsCount = dbSummary?.totalSettlements ?? rpcSettlementsCount;

  const rpcEarnedNetUsdc = paidEvents.reduce((sum, e) => {
    const netVal = parseFloat(e.amountNetUsdc?.replace("+", "") || "0") || 0;
    return sum + netVal;
  }, 0).toFixed(2);
  const totalEarnedNetUsdc = dbSummary ? dbSummary.totalEarnedNet : rpcEarnedNetUsdc;

  const rpcGrossBilledUsdc = paidEvents.reduce((sum, e) => {
    const grossVal = parseFloat(e.amountGrossUsdc || "0") || 0;
    return sum + grossVal;
  }, 0).toFixed(2);
  const totalGrossBilledUsdc = dbSummary ? dbSummary.totalGrossBilled : rpcGrossBilledUsdc;

  // Renewal Success Rate
  const totalEvaluated = activeCount + pastDueSubscribers.length;
  const hasHistory = totalEvaluated > 0 || totalSettlementsCount > 0;
  const renewalSuccessRate = hasHistory
    ? pastDueSubscribers.length === 0
      ? "100%"
      : `${((activeCount / totalEvaluated) * 100).toFixed(0)}%`
    : "—";

  return (
    <div className="flex w-full min-w-0 max-w-full flex-col gap-6 pb-16 sm:pb-0">
      {/* Top Header Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Real-time subscriber and billing analytics across all your TidePay plans.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div role="tablist" aria-label="Chain" className="flex rounded-xl border border-border bg-card p-1">
            {(["solana", "near"] as const).map((c) => (
              <button
                key={c}
                type="button"
                role="tab"
                aria-selected={chain === c}
                onClick={() => setChain(c)}
                className={cn(
                  "rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors",
                  chain === c ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {c === "solana" ? "Solana" : "NEAR"}
              </button>
            ))}
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
          <Button asChild size="sm" className="hidden sm:inline-flex gap-1.5">
            <Link href={`/plans/new?network=${chain}`}>
              <Plus className="size-3.5" />
              Create Plan
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Total Earned (Net)",
            value: `${totalEarnedNetUsdc} USDC`,
            note:
              totalSettlementsCount > 0
                ? `${totalGrossBilledUsdc} USDC gross across ${totalSettlementsCount} settlements`
                : "Across 0 on-chain settlements",
          },
          {
            label: "Monthly Revenue (MRR)",
            value: `${totalMrr} USDC`,
            note:
              activeCount > 0
                ? `Normalized across ${activeCount} active subscriber(s)`
                : "Normalized across 0 subscriber(s)",
          },
          {
            label: "Active Subscribers",
            value: String(activeCount),
            note:
              allTimeCount > 0
                ? `${allTimeCount} total all-time (${activeCount} active, ${pastCount} past)`
                : "Ready for subscriptions",
          },
          {
            label: "Renewal Success Rate",
            value: renewalSuccessRate,
            note: !hasHistory
              ? "No renewal attempts yet"
              : pastDueSubscribers.length === 0
                ? "100% on-chain settlements"
                : `${pastDueSubscribers.length} renewal(s) past due`,
          },
        ].map((k) => (
          <Card key={k.label} className="p-5 sm:p-6">
            <div className="text-sm text-muted-foreground">{k.label}</div>
            <div className="mt-2 text-2xl font-bold tracking-tight tabular-nums text-foreground sm:text-3xl">
              {k.value}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">{k.note}</p>
          </Card>
        ))}
      </div>

      {/* Revenue chart + side panels */}
      <div className="grid w-full min-w-0 gap-4 lg:grid-cols-3 items-stretch">
        <Card className="flex min-w-0 flex-col justify-between p-5 sm:p-6 lg:col-span-2 h-full">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold">Revenue over time</CardTitle>
            <span className="text-sm text-muted-foreground">Last 30 days</span>
          </div>
          <RevenueChart events={paidEvents} />
        </Card>

        <div className="flex min-w-0 flex-col justify-between gap-4 h-full">
          <Card className="flex-1 p-5 sm:p-6 flex flex-col justify-between">
            <CardTitle className="mb-4 text-lg font-bold">Quick Actions</CardTitle>
            <div className="flex flex-col gap-3">
              <Button asChild variant="secondary" className="justify-start rounded-xl border border-border font-semibold">
                <Link href={`/plans/new?network=${chain}`}>+ Create New Plan</Link>
              </Button>
              {isNear ? (
                <Button asChild variant="secondary" className="justify-start rounded-xl border border-border font-semibold">
                  <Link href="/plans">Share Checkout Link</Link>
                </Button>
              ) : (
                <Button asChild variant="secondary" className="justify-start rounded-xl border border-border font-semibold">
                  <Link href="/plans">Share a Blink</Link>
                </Button>
              )}
              <Button asChild variant="secondary" className="justify-start rounded-xl border border-border font-semibold">
                <Link href="/developers">Developer SDK</Link>
              </Button>
            </div>
          </Card>

          <Card className="flex-1 p-5 sm:p-6 flex flex-col justify-between">
            <CardTitle className="mb-3 text-lg font-bold">Keeper Crank</CardTitle>
            <div className="flex flex-col gap-2 text-sm">
              {crankRows.map((row) => (
                <div key={row.label} className="flex items-center justify-between">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="font-medium text-foreground">{row.value}</span>
                </div>
              ))}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Network</span>
                <span className="font-medium text-primary">{isNear ? "NEAR Testnet" : "Solana Devnet"}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Plans Performance Breakdown Table */}
      <Card className="w-full min-w-0 overflow-hidden">
        <CardHeader className="flex flex-col items-start gap-1 pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2.5">
              <CardTitle className="text-base">Plans Performance</CardTitle>
              <Badge variant="outline" className="tabular-nums">
                {plans.length} plan{plans.length === 1 ? "" : "s"}
              </Badge>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-xs text-primary hover:underline -ml-2 sm:-mr-2 sm:ml-0 self-start sm:self-auto">
              <Link href="/plans">Manage all plans →</Link>
            </Button>
          </div>
          <CardDescription className="text-xs sm:text-sm">
            All recurring subscription plans deployed from this merchant wallet.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {plans.length === 0 ? (
            <div className="p-6 sm:p-8 text-center text-sm text-muted-foreground">
              No plans created yet. Click &quot;Create Plan&quot; above to launch your first recurring billing plan!
            </div>
          ) : (
            <Table className="min-w-155 md:min-w-full">
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
                  const planDb = dbByPlan[p.id];
                  const planPulls = planDb ? planDb.totalSettlements : planPaidEvents.length;
                  const planEarnedNet = planDb
                    ? planDb.totalEarnedNet
                    : planPaidEvents
                        .reduce((sum, e) => sum + (parseFloat(e.amountNetUsdc?.replace("+", "") || "0") || 0), 0)
                        .toFixed(2);

                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs font-semibold text-foreground">
                        <Link href={planLinks(p.id).detailPath(p.name || p.id)} className="hover:text-primary hover:underline">
                          {p.name}
                        </Link>
                        {p.network === "near" && <Badge variant="outline" className="ml-2">NEAR</Badge>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {p.priceUsdc} USDC / {intervalUnit(p.intervalSeconds)}
                      </TableCell>
                      <TableCell className="text-xs">
                        <span className="font-semibold text-foreground">{planActiveSubs} active</span>
                        {planPulls > 0 && (
                          <span className="text-muted-foreground text-[11px] ml-1.5">
                            ({planPulls} pull{planPulls === 1 ? "" : "s"})
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
                            <a href={planLinks(p.id).checkout} target="_blank" rel="noreferrer">
                              Checkout
                              <ExternalLink className="size-3" />
                            </a>
                          </Button>
                          {planLinks(p.id).blink && (
                            <ShareBlinkButton
                              planId={p.id}
                              planName={p.name}
                              priceUsdc={p.priceUsdc}
                              variant="outline"
                              className="h-7 px-2 text-xs"
                              align="right"
                            />
                          )}
                          <Button asChild size="sm" className="h-7 px-2.5 text-xs">
                            <Link href={planLinks(p.id).detailPath(p.name || p.id)}>
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
      <div className="grid w-full min-w-0 gap-6">
        {/* Left Column: Recent Billing Settlements across All Plans */}
        <div className="w-full min-w-0">
          <Card className="w-full min-w-0 overflow-hidden">
            <CardHeader className="flex flex-col items-start gap-1 pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2.5">
                  <CardTitle className="text-base">Recent Settlements & Activity</CardTitle>
                  <Badge variant="outline" className="tabular-nums">
                    {onChainEvents.length} on-chain
                  </Badge>
                </div>
                <Button asChild variant="ghost" size="sm" className="text-xs text-primary hover:underline -ml-2 sm:-mr-2 sm:ml-0 self-start sm:self-auto">
                  <Link href="/subscribers">View subscribers →</Link>
                </Button>
              </div>
              <CardDescription className="text-xs sm:text-sm">
                Live on-chain subscription events and keeper crank renewals across all plans.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {onChainEvents.length === 0 ? (
                <div className="p-6 sm:p-8 text-center text-sm text-muted-foreground">
                  {loadingEvents ? `Loading on-chain events from ${isNear ? "NEAR Testnet" : "Solana Devnet"}…` : "No on-chain activity yet."}
                </div>
              ) : (
                <Table className="min-w-145 md:min-w-full">
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
                            href={isNear ? nearExplorerUrl("address", event.subscriber || "") : explorerUrl("tx", event.signature)}
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

      </div>

      {/* Mobile Floating Action Button (FAB) */}
      <div className="fixed bottom-6 right-6 z-40 sm:hidden">
        <Button asChild size="lg" className="h-12 rounded-full px-4.5 shadow-xl shadow-primary/25 gap-2 font-medium transition-transform active:scale-95">
          <Link href={`/plans/new?network=${chain}`}>
            <Plus className="size-5" />
            <span>Create Plan</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}

const DAY_MS = 86_400_000;

function RevenueChart({ events }: { events: PlanOnChainEvent[] }) {
  // Block times arrive in ms; treat small values as seconds.
  const [now] = useState(() => Date.now());
  const start = now - 30 * DAY_MS;
  const daily = new Array<number>(30).fill(0);
  for (const e of events) {
    const t = e.timestamp < 1e12 ? e.timestamp * 1000 : e.timestamp;
    const day = Math.floor((t - start) / DAY_MS);
    if (day >= 0 && day < 30) daily[day] += parseFloat(e.amountNetUsdc?.replace("+", "") || "0") || 0;
  }
  const hasData = daily.some((v) => v > 0);
  const max = Math.max(...daily, 1);
  const W = 600;
  const H = 200;
  const pts = daily.map((v, i) => [(i / (daily.length - 1)) * W, H - 10 - (v / max) * (H - 30)]);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

  return (
    <div className="flex flex-1 flex-col justify-between w-full h-full min-h-[220px]">
      <div className="relative flex flex-1 items-center justify-center w-full my-4 min-h-[170px]">
        {hasData ? (
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-full w-full" role="img" aria-label="Revenue over the last 30 days">
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <path d={`${line} L${W},${H} L0,${H} Z`} fill="url(#revenueGradient)" />
            <path d={line} fill="none" stroke="var(--primary)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
          </svg>
        ) : (
          <div className="relative flex flex-1 items-center justify-center w-full h-full min-h-[170px]">
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full" role="img" aria-label="No revenue yet">
              <line x1="0" y1={H * 0.25} x2={W} y2={H * 0.25} stroke="currentColor" strokeDasharray="4 4" className="text-border/40" strokeWidth="1" />
              <line x1="0" y1={H * 0.5} x2={W} y2={H * 0.5} stroke="currentColor" strokeDasharray="4 4" className="text-border/40" strokeWidth="1" />
              <line x1="0" y1={H * 0.75} x2={W} y2={H * 0.75} stroke="currentColor" strokeDasharray="4 4" className="text-border/40" strokeWidth="1" />
              <line x1="0" y1={H - 10} x2={W} y2={H - 10} stroke="currentColor" className="text-border/80" strokeWidth="1.5" />
            </svg>
            <div className="relative z-10 flex flex-col items-center justify-center text-center px-4">
              <span className="text-sm font-semibold text-foreground/80">0.00 USDC</span>
              <span className="text-xs text-muted-foreground mt-0.5">No on-chain settlements recorded yet</span>
            </div>
          </div>
        )}
      </div>
      <p className="mt-auto text-sm text-muted-foreground">
        {hasData
          ? "Net settled USDC per day across all active subscriptions."
          : "Real-time settled revenue — data points appear as subscription epochs settle."}
      </p>
    </div>
  );
}
