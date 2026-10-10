"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Users,
  UserCheck,
  UserX,
  ShieldCheck,
  Search,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { useConnection } from "@solana/wallet-adapter-react";
import { MerchantGate } from "@/components/console/merchant-gate";
import { CopyButton } from "@/components/copy-button";
import { SubscriptionStatusBadge } from "@/components/status-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DEFAULT_CRANK_BOUNTY_USDC, explorerUrl } from "@/lib/chain/config";
import {
  fetchAllMerchantPlansActivity,
  type PlanOnChainEvent,
} from "@/lib/chain/accounts";
import { formatDateTimeUtc, shortAddress } from "@/lib/format";
import type { PlanSummary, SubscriberRow, SubscriptionStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

type FilterTab = "All" | "Active" | "Cancelled" | "PastDue";

export function SubscribersView() {
  return (
    <MerchantGate>
      {(data, { refresh, isRefreshing, lastRefreshedAt }) => (
        <SubscribersContent
          plans={data.plans}
          subscribers={data.subscribers}
          onRefresh={refresh}
          isRefreshing={isRefreshing}
          lastRefreshedAt={lastRefreshedAt}
        />
      )}
    </MerchantGate>
  );
}

function SubscribersContent({
  plans,
  subscribers,
  onRefresh,
  isRefreshing,
  lastRefreshedAt,
}: {
  plans: PlanSummary[];
  subscribers: SubscriberRow[];
  onRefresh: () => void;
  isRefreshing: boolean;
  lastRefreshedAt: number | null;
}) {
  const { connection } = useConnection();
  const [onChainEvents, setOnChainEvents] = useState<PlanOnChainEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<string>("All");

  useEffect(() => {
    if (plans.length === 0) return;
    setLoadingEvents(true);
    fetchAllMerchantPlansActivity(
      connection,
      plans.map((p) => ({ id: p.id, name: p.name, priceUsdc: p.priceUsdc })),
      DEFAULT_CRANK_BOUNTY_USDC,
      20,
    )
      .then(setOnChainEvents)
      .finally(() => setLoadingEvents(false));
  }, [connection, plans, lastRefreshedAt]);

  // Consolidate all subscribers (active on-chain accounts + historical churned subscribers)
  const allSubscribers = useMemo(() => {
    const list: SubscriberRow[] = [];
    const seenWallets = new Set<string>();

    // 1. Live active/past-due accounts on-chain
    for (const sub of subscribers) {
      if (sub.wallet) {
        seenWallets.add(sub.wallet);
        list.push(sub);
      }
    }

    // 2. Historical subscribers who cancelled or whose accounts closed
    for (const event of onChainEvents) {
      if (event.subscriber && !seenWallets.has(event.subscriber)) {
        seenWallets.add(event.subscriber);
        list.push({
          id: event.signature,
          wallet: event.subscriber,
          plan: event.planName || "Subscription Plan",
          lastBilledAt: new Date(event.timestamp).toISOString(),
          nextDueAt: "—",
          status: "Cancelled" as SubscriptionStatus,
        });
      }
    }

    return list;
  }, [subscribers, onChainEvents]);

  // Counts for tabs & KPI cards
  const activeCount = allSubscribers.filter((s) => s.status === "Active").length;
  const cancelledCount = allSubscribers.filter((s) => s.status === "Cancelled").length;
  const pastDueCount = allSubscribers.filter((s) => s.status === "PastDue").length;
  const totalCount = allSubscribers.length;

  // Filtered rows
  const filteredSubscribers = useMemo(() => {
    return allSubscribers.filter((sub) => {
      // Tab filter
      if (activeTab === "Active" && sub.status !== "Active") return false;
      if (activeTab === "Cancelled" && sub.status !== "Cancelled") return false;
      if (activeTab === "PastDue" && sub.status !== "PastDue") return false;

      // Plan dropdown filter
      if (selectedPlan !== "All" && sub.plan !== selectedPlan) return false;

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesWallet = sub.wallet.toLowerCase().includes(query);
        const matchesPlan = sub.plan.toLowerCase().includes(query);
        if (!matchesWallet && !matchesPlan) return false;
      }

      return true;
    });
  }, [allSubscribers, activeTab, selectedPlan, searchQuery]);

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">All Subscribers</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Wallets subscribed across your plans with live on-chain status and full cancellation history.
          </p>
        </div>
        <div className="flex items-center gap-2">
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
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Total All-Time</span>
            <Users className="size-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-foreground tabular-nums">
            {totalCount}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {activeCount} active · {cancelledCount} past churned
          </p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Active Subscribers</span>
            <UserCheck className="size-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-foreground tabular-nums">
            {activeCount}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {activeCount > 0 ? "Non-custodial allowances" : "Ready for subscriptions"}
          </p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Cancelled / Past</span>
            <UserX className="size-4 text-muted-foreground" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-foreground tabular-nums">
            {cancelledCount}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Accounts closed & rent refunded
          </p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Renewal Success</span>
            <ShieldCheck className="size-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-foreground tabular-nums">
            {pastDueCount === 0 && totalCount > 0 ? "100%" : totalCount === 0 ? "—" : "Healthy"}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {pastDueCount === 0 ? "0 past-due accounts" : `${pastDueCount} past-due renewal(s)`}
          </p>
        </Card>
      </div>

      {/* Main Table Card with Search & Filters */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                variant={activeTab === "All" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab("All")}
                className="h-8 text-xs gap-1.5"
              >
                All
                <Badge variant={activeTab === "All" ? "neutral" : "outline"} className="px-1.5 py-0 text-[10px]">
                  {totalCount}
                </Badge>
              </Button>
              <Button
                variant={activeTab === "Active" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab("Active")}
                className="h-8 text-xs gap-1.5"
              >
                Active
                <Badge variant={activeTab === "Active" ? "neutral" : "outline"} className="px-1.5 py-0 text-[10px]">
                  {activeCount}
                </Badge>
              </Button>
              <Button
                variant={activeTab === "Cancelled" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab("Cancelled")}
                className="h-8 text-xs gap-1.5"
              >
                Cancelled / Past
                <Badge variant={activeTab === "Cancelled" ? "neutral" : "outline"} className="px-1.5 py-0 text-[10px]">
                  {cancelledCount}
                </Badge>
              </Button>
              {pastDueCount > 0 && (
                <Button
                  variant={activeTab === "PastDue" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveTab("PastDue")}
                  className="h-8 text-xs gap-1.5 text-warning"
                >
                  Past Due
                  <Badge variant="warning" className="px-1.5 py-0 text-[10px]">
                    {pastDueCount}
                  </Badge>
                </Button>
              )}
            </div>

            {/* Search Input & Plan Filter */}
            <div className="flex items-center gap-2">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search wallet or plan…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 pl-8 text-xs"
                />
              </div>
              {plans.length > 1 && (
                <select
                  value={selectedPlan}
                  onChange={(e) => setSelectedPlan(e.target.value)}
                  aria-label="Filter by plan"
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground outline-none"
                >
                  <option value="All">All Plans</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredSubscribers.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              {searchQuery || activeTab !== "All" || selectedPlan !== "All" ? (
                <div className="flex flex-col items-center gap-2">
                  <p>No subscribers match your current filter.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setActiveTab("All");
                      setSearchQuery("");
                      setSelectedPlan("All");
                    }}
                    className="text-xs mt-1"
                  >
                    Clear Filters
                  </Button>
                </div>
              ) : loadingEvents ? (
                "Loading subscriber history from Solana Devnet…"
              ) : (
                "No subscribers found yet. Share your Blink URL on X or send your checkout link to start collecting subscriptions!"
              )}
            </div>
          ) : (
            <Table className="min-w-190">
              <TableHeader>
                <TableRow className="border-t-0 hover:bg-transparent">
                  <TableHead>Subscriber Wallet</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Billed</TableHead>
                  <TableHead>Next Renewal</TableHead>
                  <TableHead className="text-right">Explorer</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubscribers.map((row) => (
                  <TableRow key={row.wallet}>
                    <TableCell className="font-mono text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-foreground">{shortAddress(row.wallet)}</span>
                        <CopyButton value={row.wallet} label="Copy wallet" />
                      </div>
                    </TableCell>
                    <TableCell className="text-foreground/80 font-mono text-xs font-medium">
                      <Link href={`/plans/${encodeURIComponent(row.plan)}`} className="hover:text-primary hover:underline">
                        {row.plan}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <SubscriptionStatusBadge status={row.status} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatDateTimeUtc(row.lastBilledAt)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {row.nextDueAt === "—" ? (
                        <span className="text-muted-foreground/60">— (Cancelled)</span>
                      ) : (
                        formatDateTimeUtc(row.nextDueAt)
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <a
                        href={explorerUrl("address", row.wallet)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                      >
                        Account
                        <ExternalLink className="size-3" />
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
  );
}
