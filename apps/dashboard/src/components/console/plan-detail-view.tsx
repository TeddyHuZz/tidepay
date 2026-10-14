"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  Zap,
  Users,
  ShieldCheck,
  DollarSign,
  ArrowUpRight,
  RefreshCw,
  Wallet,
  PauseCircle,
  PlayCircle,
  Loader2,
} from "lucide-react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { MerchantGate } from "@/components/console/merchant-gate";
import { CopyButton } from "@/components/copy-button";
import { ShareBlinkButton } from "@/components/console/share-blink-button";
import { useToast } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { DEFAULT_CRANK_BOUNTY_USDC, blinkUrl, checkoutUrl, explorerUrl } from "@/lib/chain/config";
import { createClient, DEFAULT_ACTIVITY_LIMIT, fetchDatabaseSettlements, fetchPlanActivity, parseAddress, type PlanOnChainEvent } from "@/lib/chain/accounts";
import { useSendTransaction } from "@/hooks/use-send-transaction";
import { intervalLabel, intervalUnit, type PlanSummary, type SubscriberRow, type ActivityEvent } from "@/lib/types";
import { cn } from "@/lib/utils";

interface PlanDetailViewProps {
  planId: string;
}

export function PlanDetailView({ planId }: PlanDetailViewProps) {
  return (
    <MerchantGate>
      {({ plans, subscribers, activity }, { refresh, isRefreshing, lastRefreshedAt }) => (
        <PlanDetailContent
          planId={planId}
          plans={plans}
          subscribers={subscribers}
          activity={activity}
          onRefresh={refresh}
          isRefreshing={isRefreshing}
          lastRefreshedAt={lastRefreshedAt}
        />
      )}
    </MerchantGate>
  );
}

function PlanDetailContent({
  planId,
  plans,
  subscribers,
  activity,
  onRefresh,
  isRefreshing,
  lastRefreshedAt,
}: {
  planId: string;
  plans: PlanSummary[];
  subscribers: SubscriberRow[];
  activity: ActivityEvent[];
  onRefresh: () => void;
  isRefreshing: boolean;
  lastRefreshedAt: number | null;
}) {
  const { connection } = useConnection();
  const [onChainEvents, setOnChainEvents] = useState<PlanOnChainEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [hasResolvedSettlements, setHasResolvedSettlements] = useState(false);
  const [planDbStats, setPlanDbStats] = useState<{ totalSettlements: number; totalEarnedNet: string; totalGrossBilled: string } | null>(null);

  const decodedParam = decodeURIComponent(planId);
  const plan = plans.find((p) => p.name === decodedParam || p.id === decodedParam);

  useEffect(() => {
    if (!plan?.id) return;
    const pubkey = parseAddress(plan.id);
    if (!pubkey) return;

    let cancelled = false;

    // Primary: Instant 5ms query from Neon Postgres indexer
    fetchDatabaseSettlements([plan.id]).then((res) => {
      if (cancelled) return;
      if (res && res.byPlan[plan.id]) {
        setPlanDbStats(res.byPlan[plan.id]);
        if (res.events && res.events.length > 0) {
          setOnChainEvents((prev) => (prev.length === 0 ? res.events : prev));
        }
        setHasResolvedSettlements(true);
      }
    });

    setLoadingEvents(true);
    fetchPlanActivity(
      connection,
      pubkey,
      plan.priceUsdc,
      DEFAULT_CRANK_BOUNTY_USDC,
      DEFAULT_ACTIVITY_LIMIT,
      plan.name,
    )
      .then((events) => {
        if (!cancelled) setOnChainEvents(events);
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingEvents(false);
          setHasResolvedSettlements(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [connection, plan?.id, plan?.priceUsdc, lastRefreshedAt]);

  const isSettlementsLoading = !hasResolvedSettlements && !planDbStats && onChainEvents.length === 0;

  const { publicKey } = useWallet();
  const { buildTransaction, send } = useSendTransaction();
  const { success: toastSuccess, error: toastError } = useToast();
  const [isToggling, setIsToggling] = useState(false);

  const handleTogglePlan = async () => {
    if (!plan?.id || !publicKey) {
      toastError("Wallet required", "Connect your merchant wallet to update this plan.");
      return;
    }
    const planPubkey = parseAddress(plan.id);
    if (!planPubkey) return;

    setIsToggling(true);
    try {
      const client = createClient(connection);
      const targetActive = !plan.active;
      const { instruction } = await client.buildTogglePlanStatusInstruction({
        merchant: publicKey,
        plan: planPubkey,
        isActive: targetActive,
      });

      const tx = await buildTransaction(publicKey, [instruction]);
      await send(tx);

      toastSuccess(
        targetActive ? "Plan Resumed" : "Plan Paused",
        targetActive
          ? `${plan.name} is now active and accepting subscriptions.`
          : `${plan.name} is paused. New checkouts will be rejected.`
      );

      setTimeout(() => {
        onRefresh();
      }, 1000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toastError("Update failed", message);
    } finally {
      setIsToggling(false);
    }
  };

  if (!plan) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <Button asChild variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground -ml-2">
            <Link href="/plans">
              <ArrowLeft className="size-4" />
              Back to plans
            </Link>
          </Button>
        </div>
        <Card className="p-8 text-center">
          <CardTitle className="text-lg">Plan not found</CardTitle>
          <CardDescription className="mt-2">
            Could not find a plan matching &quot;{decodedParam}&quot;. It might still be indexing on Solana Devnet.
          </CardDescription>
          <div className="mt-6 flex justify-center gap-3">
            <Button asChild variant="outline">
              <Link href="/plans">View all plans</Link>
            </Button>
            <Button asChild>
              <Link href="/plans/new">Create a plan</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Metrics calculations
  const planSubscribers = subscribers.filter(
    (s) => s.plan === plan.id || s.plan === plan.name,
  );
  const activeCount = planSubscribers.filter((s) => s.status === "Active").length;
  const pastDueCount = planSubscribers.filter((s) => s.status === "PastDue").length;
  const totalEvaluated = activeCount + pastDueCount;
  const settledCount = onChainEvents.filter((e) => e.kind === "settled").length;
  const hasRenewalHistory = totalEvaluated > 0 || settledCount > 0;
  const successRate = hasRenewalHistory
    ? pastDueCount === 0
      ? "100%"
      : `${((activeCount / totalEvaluated) * 100).toFixed(0)}%`
    : "—";
        
        const priceNum = parseFloat(plan.priceUsdc) || 0;
        const keeperFeeNum = parseFloat(DEFAULT_CRANK_BOUNTY_USDC) || 0.05;
        const netPerCycle = Math.max(0, priceNum - keeperFeeNum).toFixed(2);
        
        // Approximate 30-day normalized MRR
        const cycleSeconds = plan.intervalSeconds || 2_592_000;
        const mrr = ((priceNum * activeCount * 2_592_000) / cycleSeconds).toFixed(2);
        const rpcPaidCount = onChainEvents.filter((e) => e.kind === "settled" || e.kind === "subscribed").length;
        const paidEventsCount = planDbStats ? planDbStats.totalSettlements : rpcPaidCount;
        const totalSettledUsdc = planDbStats ? planDbStats.totalEarnedNet : (paidEventsCount * parseFloat(netPerCycle)).toFixed(2);
        const grossSettledUsdc = planDbStats ? planDbStats.totalGrossBilled : (paidEventsCount * priceNum).toFixed(2);

        // Calculate all-time unique subscriber count (active + past/churned)
        const allTimeSubscribers = new Set<string>();
        for (const s of planSubscribers) {
          if (s.wallet) allTimeSubscribers.add(s.wallet);
        }
        for (const event of onChainEvents) {
          if (event.subscriber) allTimeSubscribers.add(event.subscriber);
        }
        const allTimeCount = Math.max(allTimeSubscribers.size, planSubscribers.length);
        const pastCount = Math.max(0, allTimeCount - activeCount);

        // Filtered activity for this plan
        const planActivity = activity.filter(
          (a) => a.plan === plan.id || a.plan === plan.name,
        );

        const checkoutLink = checkoutUrl(plan.id);
        const actionBlink = blinkUrl(plan.id);
        const embedSnippet = `<iframe src="${checkoutLink}" width="420" height="520" frameborder="0"></iframe>`;

        return (
          <div className="flex w-full min-w-0 max-w-full flex-col gap-6">
            {/* Top Navigation */}
            <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button asChild variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground -ml-2 self-start">
                <Link href="/plans">
                  <ArrowLeft className="size-4" />
                  Back to plans
                </Link>
              </Button>
              <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRefresh()}
                  disabled={isRefreshing}
                  className="gap-1.5 text-xs text-muted-foreground hover:text-foreground flex-1 sm:flex-initial"
                >
                  <RefreshCw className={cn("size-3.5", isRefreshing && "animate-spin")} />
                  {isRefreshing ? "Syncing…" : "Refresh"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTogglePlan}
                  disabled={isToggling || isRefreshing}
                  className="gap-1.5 text-xs text-foreground hover:bg-accent hover:text-accent-foreground transition-colors flex-1 sm:flex-initial"
                >
                  {isToggling ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : plan.active ? (
                    <PauseCircle className="size-3.5 text-amber-500" />
                  ) : (
                    <PlayCircle className="size-3.5 text-emerald-500" />
                  )}
                  <span>{isToggling ? "Updating…" : plan.active ? "Pause Plan" : "Resume Plan"}</span>
                </Button>
                <Button asChild variant="outline" size="sm" className="gap-1.5 flex-1 sm:flex-initial">
                  <a href={checkoutLink} target="_blank" rel="noreferrer">
                    Checkout Link
                    <ExternalLink className="size-3.5" />
                  </a>
                </Button>
                <ShareBlinkButton
                  planId={plan.id}
                  planName={plan.name}
                  priceUsdc={plan.priceUsdc}
                  align="right"
                />
              </div>
            </div>

            {/* Plan Header */}
            <div className="flex w-full min-w-0 flex-col gap-3 rounded-xl border bg-card p-4 sm:p-6 md:flex-row md:items-center md:justify-between">
              <div className="flex min-w-0 flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-mono truncate">{plan.name}</h1>
                  <Badge variant={plan.active ? "success" : "neutral"} className="shrink-0">
                    {plan.active ? "Active" : "Paused"}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>Plan PDA:</span>
                  <code className="font-mono text-foreground/80 break-all">{plan.id.slice(0, 8)}...{plan.id.slice(-6)}</code>
                  <CopyButton value={plan.id} label="Copy plan address" />
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between sm:justify-end gap-4 sm:gap-6 border-t pt-3 sm:mt-0 sm:border-t-0 sm:pt-0">
                <div className="text-left sm:text-right">
                  <div className="text-xs text-muted-foreground">Total Earned (Net)</div>
                  {isSettlementsLoading ? (
                    <Skeleton className="h-6 w-24 mt-1 sm:ml-auto" />
                  ) : (
                    <div className="text-lg sm:text-xl font-bold text-primary tabular-nums">
                      +{totalSettledUsdc} USDC
                    </div>
                  )}
                </div>
                <div className="h-8 w-px bg-border/60" />
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Terms</div>
                  <div className="text-lg sm:text-xl font-bold text-foreground tabular-nums">
                    {plan.priceUsdc} USDC
                    <span className="text-xs sm:text-sm font-normal text-muted-foreground"> / {intervalUnit(plan.intervalSeconds)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stripe-like KPI Performance Grid */}
            <div className="grid w-full min-w-0 gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="p-5">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-medium">Monthly Revenue (MRR)</span>
                  <DollarSign className="size-4 text-primary" />
                </div>
                <div className="mt-2 text-2xl font-bold tracking-tight text-foreground tabular-nums">
                  {mrr} USDC
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {activeCount > 0
                    ? `Normalized across ${activeCount} subscriber(s)`
                    : paidEventsCount > 0
                      ? `0 active · +${totalSettledUsdc} USDC earned to date`
                      : `Normalized across 0 subscriber(s)`}
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
                  {successRate}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {!hasRenewalHistory
                    ? "No renewal attempts yet"
                    : pastDueCount === 0
                      ? "100% on-chain settlements"
                      : `${pastDueCount} renewal(s) past due`}
                </p>
              </Card>

              <Card className="p-5">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-medium">Total Earned (Net)</span>
                  <Wallet className="size-4 text-primary" />
                </div>
                <div className="mt-2 text-2xl font-bold tracking-tight text-foreground tabular-nums">
                  {totalSettledUsdc} USDC
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {paidEventsCount > 0
                    ? `${grossSettledUsdc} USDC gross across ${paidEventsCount} settlement${paidEventsCount === 1 ? "" : "s"}`
                    : "Across 0 on-chain settlements"}
                </p>
              </Card>
            </div>

            {/* Two-Column Layout: Details + Integrations & Subscribers */}
            <div className="grid w-full min-w-0 gap-6 lg:grid-cols-3">
              {/* Left Column: Plan Specifications & Integration */}
              <div className="flex w-full min-w-0 flex-col gap-6 lg:col-span-1">
                {/* Specifications Card */}
                <Card className="w-full min-w-0">
                  <CardHeader className="flex flex-col items-start gap-1 pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
                    <CardTitle className="text-base">Plan Specifications</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">On-chain parameters settled on Solana Devnet.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col divide-y text-sm px-4 sm:px-6">
                    <div className="flex justify-between py-2.5 text-xs sm:text-sm">
                      <span className="text-muted-foreground">Price</span>
                      <span className="font-semibold text-foreground">{plan.priceUsdc} USDC</span>
                    </div>
                    <div className="flex justify-between py-2.5 text-xs sm:text-sm">
                      <span className="text-muted-foreground">Interval</span>
                      <span className="font-semibold text-foreground">{intervalLabel(plan.intervalSeconds)}</span>
                    </div>
                    <div className="flex justify-between py-2.5 text-xs sm:text-sm">
                      <span className="text-muted-foreground">Keeper Reward</span>
                      <span className="font-mono text-muted-foreground">{DEFAULT_CRANK_BOUNTY_USDC} USDC</span>
                    </div>
                    <div className="flex justify-between py-2.5 text-xs sm:text-sm">
                      <span className="text-muted-foreground">Net to Merchant</span>
                      <span className="font-mono font-semibold text-primary">{netPerCycle} USDC</span>
                    </div>
                    <div className="flex justify-between py-2.5 text-xs sm:text-sm">
                      <span className="text-muted-foreground">Accepted Mint</span>
                      <span className="font-mono text-xs text-muted-foreground">USDC (Devnet)</span>
                    </div>
                    <div className="flex justify-between py-2.5 text-xs sm:text-sm">
                      <span className="text-muted-foreground">Settlement Protocol</span>
                      <span className="text-foreground">TidePay v1 (Anchor)</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Integration Hub Card */}
                <Card className="w-full min-w-0">
                  <CardHeader className="flex flex-col items-start gap-1 pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
                    <CardTitle className="text-base">Share & Integrations</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Distribute this plan via Blinks, direct link, or embed.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4 px-4 sm:px-6">
                    <div className="flex w-full min-w-0 flex-col gap-1.5">
                      <div className="flex items-center justify-between text-xs font-medium text-foreground">
                        <span>Solana Action (Blink)</span>
                        <CopyButton value={actionBlink} label="Copy Blink URL" />
                      </div>
                      <code className="w-full min-w-0 break-all rounded-md border bg-background p-2 font-mono text-[11px] text-muted-foreground">
                        {actionBlink}
                      </code>
                    </div>

                    <div className="flex w-full min-w-0 flex-col gap-1.5">
                      <div className="flex items-center justify-between text-xs font-medium text-foreground">
                        <span>Hosted Checkout Link</span>
                        <CopyButton value={checkoutLink} label="Copy checkout link" />
                      </div>
                      <code className="w-full min-w-0 break-all rounded-md border bg-background p-2 font-mono text-[11px] text-muted-foreground">
                        {checkoutLink}
                      </code>
                    </div>

                    <div className="flex w-full min-w-0 flex-col gap-1.5">
                      <div className="flex items-center justify-between text-xs font-medium text-foreground">
                        <span>Website Embed Code</span>
                        <CopyButton value={embedSnippet} label="Copy embed code" />
                      </div>
                      <code className="w-full min-w-0 break-all rounded-md border bg-background p-2 font-mono text-[11px] text-muted-foreground">
                        {embedSnippet}
                      </code>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column: Subscribers List & Activity */}
              <div className="flex w-full min-w-0 flex-col gap-6 lg:col-span-2">
                {/* Subscribers Table */}
                <Card className="w-full min-w-0 overflow-hidden">
                  <CardHeader className="flex flex-col items-start gap-1 pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
                    <div className="flex items-center gap-2.5">
                      <CardTitle className="text-base">Active Subscribers</CardTitle>
                      <Badge variant="outline" className="tabular-nums">
                        {allTimeCount > 0 ? `${activeCount} active · ${allTimeCount} all-time` : `${activeCount} active`}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs sm:text-sm">Wallets subscribed with delegated token allowances.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    {planSubscribers.length === 0 ? (
                      <div className="p-6 sm:p-8 text-center text-sm text-muted-foreground">
                        <Users className="mx-auto mb-2 size-8 text-muted-foreground/50" />
                        {allTimeCount > 0
                          ? `No active subscribers currently (${allTimeCount} past subscriber${allTimeCount === 1 ? "" : "s"}). Share your Blink URL on X or send your checkout link to start collecting subscriptions!`
                          : "No active subscribers yet. Share your Blink URL on X or send your checkout link to start collecting subscriptions!"}
                      </div>
                    ) : (
                      <Table className="min-w-130 md:min-w-full">
                        <TableHeader>
                          <TableRow className="border-t-0 hover:bg-transparent">
                            <TableHead>Subscriber Wallet</TableHead>
                            <TableHead>Next Renewal</TableHead>
                            <TableHead>Last Billed</TableHead>
                            <TableHead className="text-right">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {planSubscribers.map((sub) => (
                            <TableRow key={sub.id}>
                              <TableCell className="font-mono text-xs">
                                <div className="flex items-center gap-1.5">
                                  <span>{sub.wallet.slice(0, 6)}...{sub.wallet.slice(-4)}</span>
                                  <CopyButton value={sub.wallet} label="Copy wallet" />
                                </div>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">{sub.nextDueAt}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{sub.lastBilledAt}</TableCell>
                              <TableCell className="text-right">
                                <Badge variant={sub.status === "Active" ? "success" : "neutral"}>
                                  {sub.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>

                {/* Plan Settlement Activity */}
                <Card className="w-full min-w-0 overflow-hidden">
                  <CardHeader className="flex flex-col items-start gap-1 pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
                    <div className="flex items-center gap-2.5">
                      <CardTitle className="text-base">Recent Settlements & Events</CardTitle>
                      {onChainEvents.length > 0 && (
                        <Badge variant="outline" className="tabular-nums">
                          {onChainEvents.length} on-chain
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="text-xs sm:text-sm">On-chain renewal transactions executed by Keeper Cranks.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    {isSettlementsLoading ? (
                      <Table className="min-w-145 md:min-w-full">
                        <TableHeader>
                          <TableRow className="border-t-0 hover:bg-transparent">
                            <TableHead>Event</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Time</TableHead>
                            <TableHead>Amount (Net)</TableHead>
                            <TableHead className="text-right">Transaction</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {[1, 2, 3, 4, 5].map((i) => (
                            <TableRow key={i} className="hover:bg-transparent">
                              <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                              <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                              <TableCell><Skeleton className="h-3.5 w-24" /></TableCell>
                              <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                              <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : onChainEvents.length === 0 && planActivity.length === 0 ? (
                      <div className="p-6 sm:p-8 text-center text-sm text-muted-foreground">
                        {loadingEvents
                          ? "Loading on-chain events from Solana Devnet..."
                          : "No transactions recorded for this plan yet. Renewals will log here automatically once subscribers are billed."}
                      </div>
                    ) : onChainEvents.length > 0 ? (
                      <Table className="min-w-145 md:min-w-full">
                        <TableHeader>
                          <TableRow className="border-t-0 hover:bg-transparent">
                            <TableHead>Event</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Time</TableHead>
                            <TableHead>Amount (Net)</TableHead>
                            <TableHead className="text-right">Transaction</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {onChainEvents.map((event) => (
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
                              <TableCell>
                                <Badge variant={event.err ? "warning" : "success"}>
                                  {event.err ? "Failed" : "Confirmed"}
                                </Badge>
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
                    ) : (
                      <Table className="min-w-130 md:min-w-full">
                        <TableHeader>
                          <TableRow className="border-t-0 hover:bg-transparent">
                            <TableHead>Event</TableHead>
                            <TableHead>Subscriber</TableHead>
                            <TableHead>Time</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {planActivity.map((event) => (
                            <TableRow key={event.id}>
                              <TableCell className="font-medium text-xs capitalize text-foreground">
                                {event.kind}
                              </TableCell>
                              <TableCell className="font-mono text-xs text-muted-foreground">
                                {event.wallet.slice(0, 6)}...{event.wallet.slice(-4)}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">{event.at}</TableCell>
                              <TableCell className="text-right font-mono text-xs font-semibold text-primary">
                                {event.amountUsdc} USDC
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
          </div>
        );
}
