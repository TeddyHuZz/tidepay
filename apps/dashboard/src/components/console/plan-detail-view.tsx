"use client";

import { useEffect, useMemo, useState } from "react";
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
import { DEFAULT_CRANK_BOUNTY_USDC, explorerUrl, planLinks } from "@/lib/chain/config";
import { nearExplorerUrl } from "@/lib/near/config";
import { useNearMerchant } from "@/hooks/use-near-merchant";
import { describeNearError } from "@/lib/near/errors";
import { fromNearPlanId, isNearPlanId } from "@/lib/near/ids";
import { nearNetPayout } from "@/lib/near/plan-args";
import { formatUsdc, parseUsdc } from "@/lib/chain/derive";
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
  const [planDbStats, setPlanDbStats] = useState<{ totalSettlements: number; totalEarnedNet: string; totalGrossBilled: string } | null>(null);

  const decodedParam = decodeURIComponent(planId);
  const plan = plans.find(
    (p) =>
      p.id === decodedParam ||
      p.name === decodedParam ||
      (isNearPlanId(decodedParam) && (p.id === decodedParam || p.name === fromNearPlanId(decodedParam))) ||
      (isNearPlanId(p.id) && fromNearPlanId(p.id) === decodedParam),
  );

  useEffect(() => {
    if (!plan?.id) return;
    const pubkey = parseAddress(plan.id);
    if (!pubkey) return;

    // Primary: Instant 5ms query from Neon Postgres indexer
    fetchDatabaseSettlements([plan.id]).then((res) => {
      if (res && res.byPlan[plan.id]) {
        setPlanDbStats(res.byPlan[plan.id]);
        if (res.events && res.events.length > 0) {
          setOnChainEvents((prev) => (prev.length === 0 ? res.events : prev));
        }
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
      .then(setOnChainEvents)
      .finally(() => setLoadingEvents(false));
  }, [connection, plan?.id, plan?.priceUsdc, lastRefreshedAt]);

  const { publicKey } = useWallet();
  const { prepare } = useNearMerchant();
  const { buildTransaction, send } = useSendTransaction();
  const { success: toastSuccess, error: toastError } = useToast();
  const [isToggling, setIsToggling] = useState(false);

  const handleTogglePlan = async () => {
    if (!plan?.id || !publicKey) {
      toastError("Wallet required", "Connect your merchant wallet to update this plan.");
      return;
    }
    if (isNearPlanId(plan.id)) {
      setIsToggling(true);
      try {
        const nearClient = await prepare();
        if (!nearClient) throw new Error("Could not set up your NEAR account. Please try again.");
        const targetActive = !plan.active;
        await nearClient.togglePlanStatus(fromNearPlanId(plan.id), targetActive);
        toastSuccess(
          targetActive ? "Plan Resumed" : "Plan Paused",
          targetActive ? `${plan.name} is now active and accepting subscriptions.` : `${plan.name} is paused. New checkouts will be rejected.`,
        );
        setTimeout(() => onRefresh(), 1000);
      } catch (err) {
        toastError("Update failed", describeNearError(err));
      } finally {
        setIsToggling(false);
      }
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
    if (isRefreshing) {
      return (
        <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading plan details">
          <div className="h-9 w-28 animate-pulse rounded border bg-card" />
          <div className="h-24 w-full animate-pulse rounded-xl border bg-card" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-lg border bg-card" />
            ))}
          </div>
          <div className="h-64 w-full animate-pulse rounded-xl border bg-card" />
        </div>
      );
    }

    const isNearTarget = isNearPlanId(decodedParam);
    const targetCluster = isNearTarget ? "NEAR Testnet" : "Solana Devnet";

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
            Could not find a plan matching &quot;{decodedParam}&quot;. It might still be indexing on {targetCluster}.
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

  const isNear = isNearPlanId(plan.id);
  const [activeTab, setActiveTab] = useState<"overview" | "subscribers" | "settlements" | "integrations">("overview");

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
  const priceUnits = parseUsdc(plan.priceUsdc);
  const netPerCycle =
    isNear && priceUnits !== null
      ? formatUsdc(nearNetPayout(priceUnits))
      : Math.max(0, priceNum - keeperFeeNum).toFixed(2);

  // Approximate 30-day normalized MRR
  const cycleSeconds = plan.intervalSeconds || 2_592_000;
  const mrr = ((priceNum * activeCount * 2_592_000) / cycleSeconds).toFixed(2);
  const rpcPaidCount = onChainEvents.filter((e) => e.kind === "settled" || e.kind === "subscribed").length;
  // NEAR has no Solana event history; each paid cycle is counted from the subscription records.
  const nearPaidCycles = planSubscribers.reduce((total, s) => total + (s.cycleCount ?? 0), 0);
  const paidEventsCount = isNear ? nearPaidCycles : planDbStats ? planDbStats.totalSettlements : rpcPaidCount;
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

  const planChartEvents: PlanOnChainEvent[] = useMemo(() => {
    if (isNear) {
      return planSubscribers
        .filter((s) => (s.cycleCount ?? 0) > 0 && s.lastBilledAt)
        .map((s) => {
          const gross = priceNum;
          const at = s.lastBilledAt ? new Date(s.lastBilledAt).getTime() : Date.now();
          return {
            signature: s.id,
            kind: ((s.cycleCount ?? 0) > 1 ? "settled" : "subscribed") as "settled" | "subscribed",
            label: (s.cycleCount ?? 0) > 1 ? "Subscription Renewal" : "New Subscription",
            timestamp: at,
            timeFormatted: new Date(at).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }),
            err: false,
            amountGrossUsdc: gross.toFixed(2),
            amountNetUsdc: netPerCycle,
            keeperFeeUsdc: DEFAULT_CRANK_BOUNTY_USDC,
            subscriber: s.wallet,
            planName: plan.name,
            planAddress: plan.id,
          };
        });
    }
    return onChainEvents;
  }, [isNear, planSubscribers, priceNum, netPerCycle, plan.name, plan.id, onChainEvents]);

  const links = planLinks(plan.id);
  const checkoutLink = links.checkout;
  const actionBlink = links.blink;
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
          {links.blink && (
            <ShareBlinkButton
              planId={plan.id}
              planName={plan.name}
              priceUsdc={plan.priceUsdc}
              align="right"
            />
          )}
        </div>
      </div>

      {/* Plan Header */}
      <div className="flex w-full min-w-0 flex-col gap-4 rounded-xl border bg-card p-5 sm:p-6 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-mono truncate">{plan.name}</h1>
            <Badge variant={plan.active ? "success" : "neutral"} className="shrink-0 gap-1.5 font-medium">
              <span className={cn("size-1.5 rounded-full", plan.active ? "bg-emerald-400" : "bg-muted-foreground")} />
              {plan.active ? "Active" : "Paused"}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>{isNear ? "Plan ID" : "Plan PDA"}</span>
            <code className="font-mono text-foreground/90 break-all font-medium">
              {isNear ? plan.name : `${plan.id.slice(0, 8)}...${plan.id.slice(-6)}`}
            </code>
            <CopyButton value={isNear ? plan.name : plan.id} label={isNear ? "Copy plan ID" : "Copy plan address"} />
            <Badge variant="outline" className="text-[11px] font-normal">
              {isNear ? "NEAR Testnet" : "Solana Devnet"}
            </Badge>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between sm:justify-end gap-6 sm:gap-8 border-t pt-3 sm:mt-0 sm:border-t-0 sm:pt-0">
          <div className="text-left sm:text-right">
            <div className="text-xs text-muted-foreground">Total earned (net)</div>
            <div className="text-lg sm:text-xl font-bold text-primary tabular-nums">
              +{totalSettledUsdc} USDC
            </div>
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

      {/* Tab Navigation */}
      <div className="flex items-center gap-6 sm:gap-8 border-b border-border/60 text-sm overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={cn(
            "pb-3 -mb-px border-b-2 font-medium transition-colors whitespace-nowrap",
            activeTab === "overview"
              ? "border-primary text-foreground font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          Overview
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("subscribers")}
          className={cn(
            "pb-3 -mb-px border-b-2 font-medium transition-colors whitespace-nowrap",
            activeTab === "subscribers"
              ? "border-primary text-foreground font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          Subscribers · {planSubscribers.length}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("settlements")}
          className={cn(
            "pb-3 -mb-px border-b-2 font-medium transition-colors whitespace-nowrap",
            activeTab === "settlements"
              ? "border-primary text-foreground font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          Settlements
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("integrations")}
          className={cn(
            "pb-3 -mb-px border-b-2 font-medium transition-colors whitespace-nowrap",
            activeTab === "integrations"
              ? "border-primary text-foreground font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          Share & Integrations
        </button>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === "overview" && (
        <div className="flex w-full min-w-0 flex-col gap-6">
          {/* 4 KPI Cards */}
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
                +{totalSettledUsdc} USDC
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {paidEventsCount > 0
                  ? `${grossSettledUsdc} USDC gross across ${paidEventsCount} settlement${paidEventsCount === 1 ? "" : "s"}`
                  : "Across 0 on-chain settlements"}
              </p>
            </Card>
          </div>

          {/* Standard Full-Size Revenue Over Time Card */}
          <Card className="w-full min-w-0 p-5 sm:p-6">
            <div className="flex items-center justify-between pb-2">
              <div>
                <h3 className="text-base font-semibold text-foreground">Revenue over time</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Real-time net settled USDC for this plan over the last 30 days.
                </p>
              </div>
              <Badge variant="outline" className="text-xs font-normal text-muted-foreground shrink-0">
                Last 30 days
              </Badge>
            </div>
            <RevenueChart events={planChartEvents} />
          </Card>

          {/* Plan Specifications Card */}
          <Card className="w-full min-w-0">
            <CardHeader className="flex flex-col items-start gap-1 pb-3 px-4 sm:px-6 pt-4 sm:pt-6 border-b border-border/40">
              <CardTitle className="text-base">Plan specifications</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                On-chain parameters settled on {isNear ? "NEAR Testnet" : "Solana Devnet"}.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-border/30">
                  <span className="text-muted-foreground">Price</span>
                  <span className="font-semibold text-foreground">{plan.priceUsdc} USDC</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border/30">
                  <span className="text-muted-foreground">Interval</span>
                  <span className="font-semibold text-foreground">{intervalLabel(plan.intervalSeconds)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border/30">
                  <span className="text-muted-foreground">Keeper reward</span>
                  <span className="font-mono text-muted-foreground">{DEFAULT_CRANK_BOUNTY_USDC} USDC</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border/30">
                  <span className="text-muted-foreground">Protocol fee</span>
                  <span className="font-mono text-muted-foreground">{isNear ? "1.0%" : "0.5%"}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border/30">
                  <span className="text-muted-foreground">Net to merchant</span>
                  <span className="font-mono font-semibold text-primary">{netPerCycle} USDC</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border/30">
                  <span className="text-muted-foreground">Accepted mint</span>
                  <span className="font-mono text-xs text-muted-foreground">{isNear ? "USDC (NEAR Testnet)" : "USDC (Devnet)"}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border/30 md:col-span-2">
                  <span className="text-muted-foreground">Settlement protocol</span>
                  <span className="text-foreground">{isNear ? "TidePay v1 (NEAR contract)" : "TidePay v1 (Anchor)"}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 2: Subscribers */}
      {activeTab === "subscribers" && (
        <Card className="w-full min-w-0 overflow-hidden">
          <CardHeader className="flex flex-col items-start gap-1 pb-3 px-4 sm:px-6 pt-4 sm:pt-6 border-b border-border/40">
            <div className="flex items-center gap-2.5">
              <CardTitle className="text-base">Plan Subscribers</CardTitle>
              <Badge variant="outline" className="tabular-nums">
                {allTimeCount > 0 ? `${activeCount} active · ${allTimeCount} all-time` : `${activeCount} active`}
              </Badge>
            </div>
            <CardDescription className="text-xs sm:text-sm">
              {isNear ? "Accounts subscribed with prepaid balances on NEAR Testnet." : "Wallets subscribed with delegated token allowances on Solana Devnet."}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {planSubscribers.length === 0 ? (
              <div className="p-8 sm:p-12 text-center text-sm text-muted-foreground">
                <Users className="mx-auto mb-2 size-8 text-muted-foreground/50" />
                {allTimeCount > 0
                  ? `No active subscribers currently (${allTimeCount} past subscriber${allTimeCount === 1 ? "" : "s"}). Share your checkout link to start collecting subscriptions!`
                  : "No active subscribers yet. Share your checkout link to start collecting subscriptions!"}
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
      )}

      {/* Tab 3: Settlements */}
      {activeTab === "settlements" && (
        <Card className="w-full min-w-0 overflow-hidden">
          <CardHeader className="flex flex-col items-start gap-1 pb-3 px-4 sm:px-6 pt-4 sm:pt-6 border-b border-border/40">
            <div className="flex items-center gap-2.5">
              <CardTitle className="text-base">Recent Settlements & Events</CardTitle>
              {onChainEvents.length > 0 && (
                <Badge variant="outline" className="tabular-nums">
                  {onChainEvents.length} on-chain
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs sm:text-sm">
              On-chain renewal transactions executed by Keeper Cranks.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {onChainEvents.length === 0 && planActivity.length === 0 ? (
              <div className="p-8 sm:p-12 text-center text-sm text-muted-foreground">
                {loadingEvents
                  ? `Loading on-chain events from ${isNear ? "NEAR Testnet" : "Solana Devnet"}...`
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
      )}

      {/* Tab 4: Share & Integrations */}
      {activeTab === "integrations" && (
        <Card className="w-full min-w-0">
          <CardHeader className="flex flex-col items-start gap-1 pb-3 px-4 sm:px-6 pt-4 sm:pt-6 border-b border-border/40">
            <CardTitle className="text-base">Share & Integrations</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {isNear
                ? "Distribute this plan via a direct checkout link or website embed."
                : "Distribute this plan via Blinks, direct link, or website embed."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5 p-4 sm:p-6">
            {actionBlink && (
              <div className="flex w-full min-w-0 flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs font-medium text-foreground">
                  <span>Solana Action (Blink)</span>
                  <CopyButton value={actionBlink} label="Copy Blink URL" />
                </div>
                <code className="w-full min-w-0 break-all rounded-md border bg-background p-2.5 font-mono text-xs text-muted-foreground select-all">
                  {actionBlink}
                </code>
              </div>
            )}

            <div className="flex w-full min-w-0 flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs font-medium text-foreground">
                <span>Hosted Checkout Link</span>
                <div className="flex items-center gap-2">
                  <CopyButton value={checkoutLink} label="Copy checkout link" />
                  <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 text-primary hover:text-primary">
                    <a href={checkoutLink} target="_blank" rel="noreferrer">
                      Open <ExternalLink className="size-3" />
                    </a>
                  </Button>
                </div>
              </div>
              <code className="w-full min-w-0 break-all rounded-md border bg-background p-2.5 font-mono text-xs text-muted-foreground select-all">
                {checkoutLink}
              </code>
            </div>

            <div className="flex w-full min-w-0 flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs font-medium text-foreground">
                <span>Website Embed Code</span>
                <CopyButton value={embedSnippet} label="Copy embed code" />
              </div>
              <code className="w-full min-w-0 break-all rounded-md border bg-background p-2.5 font-mono text-xs text-muted-foreground select-all">
                {embedSnippet}
              </code>
            </div>

            <div className="flex w-full min-w-0 flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs font-medium text-foreground">
                <span>{isNear ? "Plan ID" : "Plan PDA Address"}</span>
                <CopyButton value={isNear ? plan.name : plan.id} label={isNear ? "Copy plan ID" : "Copy plan address"} />
              </div>
              <code className="w-full min-w-0 break-all rounded-md border bg-background p-2.5 font-mono text-xs text-muted-foreground select-all">
                {isNear ? plan.name : plan.id}
              </code>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

const DAY_MS = 86_400_000;

function RevenueChart({ events }: { events: PlanOnChainEvent[] }) {
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
              <linearGradient id="planDetailRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <path d={`${line} L${W},${H} L0,${H} Z`} fill="url(#planDetailRevenueGradient)" />
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
      <p className="mt-auto text-xs text-muted-foreground">
        {hasData
          ? "Net settled USDC per day across this plan's subscriptions."
          : "Real-time settled revenue — data points appear as subscription epochs settle."}
      </p>
    </div>
  );
}
