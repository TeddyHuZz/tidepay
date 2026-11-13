"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
  UserX,
  X,
} from "lucide-react";
import { useConnection } from "@solana/wallet-adapter-react";
import { MerchantGate } from "@/components/console/merchant-gate";
import { CopyButton } from "@/components/copy-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DEFAULT_ACTIVITY_LIMIT,
  fetchAllMerchantPlansActivity,
  fetchDatabaseSettlements,
  type PlanOnChainEvent,
} from "@/lib/chain/accounts";
import { DEFAULT_CRANK_BOUNTY_USDC, explorerUrl, planLinks } from "@/lib/chain/config";
import { formatUsdc, parseUsdc } from "@/lib/chain/derive";
import { formatCountdown, formatDateTimeUtc, shortAddress } from "@/lib/format";
import { nearExplorerUrl } from "@/lib/near/config";
import { isNearPlanId } from "@/lib/near/ids";
import { intervalUnit, type PlanSummary, type SubscriberRow, type SubscriptionStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

type FilterTab = "All" | "Active" | "PastDue" | "Cancelled";

const ONE_WEEK_MS = 7 * 86_400 * 1000;
const EST_SOLANA_RENT_PER_SUB_SOL = 0.0021;

const AVATAR_TONES = [
  "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  "bg-violet-500/15 text-violet-400 border-violet-500/30",
  "bg-amber-500/15 text-amber-400 border-amber-500/30",
  "bg-sky-500/15 text-sky-400 border-sky-500/30",
];

function avatarToneFor(wallet: string, cancelled: boolean): string {
  if (cancelled) return "bg-muted text-muted-foreground border-border";
  let hash = 0;
  for (let i = 0; i < wallet.length; i++) hash = (hash * 31 + wallet.charCodeAt(i)) >>> 0;
  return AVATAR_TONES[hash % AVATAR_TONES.length];
}

function initialsFor(wallet: string): string {
  const clean = wallet.replace(/[^a-zA-Z0-9]/g, "");
  return (clean.slice(0, 2) || "??").toUpperCase();
}

function formatSubscriberLabel(wallet: string, isNear: boolean): string {
  if (isNear && wallet.length <= 26) return wallet;
  return shortAddress(wallet, 4);
}

function escapeCsvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}

function parseUsdcUnits(value?: string): bigint {
  if (!value) return BigInt(0);
  return parseUsdc(value.replaceAll(",", "")) ?? BigInt(0);
}

function StatusPill({ status }: { status: SubscriptionStatus }) {
  const styles: Record<SubscriptionStatus, { wrap: string; dot: string; label: string }> = {
    Active: {
      wrap: "bg-success-soft text-success border border-success/25",
      dot: "bg-success",
      label: "Active",
    },
    PastDue: {
      wrap: "bg-warning-soft text-warning border border-warning/25",
      dot: "bg-warning",
      label: "Past Due",
    },
    Cancelled: {
      wrap: "bg-neutral-soft text-neutral-soft-foreground border border-border",
      dot: "bg-muted-foreground",
      label: "Cancelled",
    },
  };
  const cfg = styles[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap", cfg.wrap)}>
      <span className={cn("size-1.5 rounded-full", cfg.dot)} aria-hidden="true" />
      {cfg.label}
    </span>
  );
}

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
  const [nowMs, setNowMs] = useState<number | null>(null);
  const [inspectedRow, setInspectedRow] = useState<SubscriberRow | null>(null);

  // Live 1s clock tick for Next Renewal countdowns (initialized client-side for clean hydration)
  useEffect(() => {
    setNowMs(Date.now());
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Close inspector modal on Escape
  useEffect(() => {
    if (!inspectedRow) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setInspectedRow(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [inspectedRow]);

  // NEAR plans have no Solana accounts; keep them out of the Solana activity fetch.
  const solanaPlans = useMemo(() => plans.filter((p) => !isNearPlanId(p.id)), [plans]);
  const solanaPlanKey = useMemo(() => solanaPlans.map((p) => p.id).join(","), [solanaPlans]);

  useEffect(() => {
    if (solanaPlans.length === 0) return;
    let cancelled = false;
    setLoadingEvents(true);

    // Populate immediately from the Postgres settlements indexer so route transitions don't block on RPC
    fetchDatabaseSettlements(solanaPlans.map((p) => p.id)).then((res) => {
      if (!cancelled && res?.events && res.events.length > 0) {
        setOnChainEvents((prev) => (prev.length === 0 ? res.events : prev));
      }
    });

    fetchAllMerchantPlansActivity(
      connection,
      solanaPlans.map((p) => ({ id: p.id, name: p.name, priceUsdc: p.priceUsdc })),
      DEFAULT_CRANK_BOUNTY_USDC,
      DEFAULT_ACTIVITY_LIMIT,
    )
      .then((events) => {
        if (!cancelled) setOnChainEvents(events);
      })
      .finally(() => {
        if (!cancelled) setLoadingEvents(false);
      });

    return () => {
      cancelled = true;
    };
    // Keyed by plan IDs so identical background polls reuse cache instead of re-fetching
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connection, solanaPlanKey, lastRefreshedAt]);

  // Consolidate active/past-due on-chain accounts + historical churned Solana subscribers
  const allSubscribers = useMemo(() => {
    const list: SubscriberRow[] = [];
    const seenWallets = new Set<string>();

    for (const sub of subscribers) {
      if (sub.wallet) {
        seenWallets.add(sub.wallet);
        list.push(sub);
      }
    }

    // Group historical Solana events by subscriber so closed accounts retain cycle & paid totals
    const historicalByWallet = new Map<
      string,
      { latest: PlanOnChainEvent; cycles: number; totalUnits: bigint }
    >();
    for (const event of onChainEvents) {
      if (!event.subscriber || seenWallets.has(event.subscriber)) continue;
      const entry = historicalByWallet.get(event.subscriber) ?? {
        latest: event,
        cycles: 0,
        totalUnits: BigInt(0),
      };
      const eventTs = Number(event.timestamp) || 0;
      const latestTs = Number(entry.latest.timestamp) || 0;
      if (eventTs > latestTs) entry.latest = event;
      if (event.kind === "settled" || event.kind === "subscribed") {
        entry.cycles += 1;
        const gross = event.amountGrossUsdc ?? event.amountUsdc;
        entry.totalUnits += parseUsdcUnits(gross);
      }
      historicalByWallet.set(event.subscriber, entry);
    }

    for (const [wallet, info] of historicalByWallet) {
      const tsMs = Number(info.latest.timestamp);
      const lastBilledIso = Number.isFinite(tsMs) && tsMs > 0 ? new Date(tsMs).toISOString() : "—";
      list.push({
        id: info.latest.signature,
        wallet,
        plan: info.latest.planName || "Subscription Plan",
        lastBilledAt: lastBilledIso,
        nextDueAt: "—",
        status: "Cancelled" as SubscriptionStatus,
        cycleCount: info.cycles || undefined,
        totalPaidUsdc: info.totalUnits > BigInt(0) ? formatUsdc(info.totalUnits) : undefined,
      });
    }

    return list;
  }, [subscribers, onChainEvents]);

  // Real KPI stats computed from consolidated records
  const stats = useMemo(() => {
    let activeCount = 0;
    let pastDueCount = 0;
    let cancelledCount = 0;
    let solanaCancelledCount = 0;
    let recentWeekCount = 0;
    let settledUnits = BigInt(0);
    let settledEpochs = 0;

    for (const row of allSubscribers) {
      if (row.status === "Active") activeCount += 1;
      else if (row.status === "PastDue") pastDueCount += 1;
      else {
        cancelledCount += 1;
        if (row.network !== "near") solanaCancelledCount += 1;
      }

      const refIso = row.startedAt ?? row.lastBilledAt;
      const refMs = Date.parse(refIso);
      if (nowMs !== null && Number.isFinite(refMs) && nowMs - refMs <= ONE_WEEK_MS) {
        recentWeekCount += 1;
      }

      settledUnits += parseUsdcUnits(row.totalPaidUsdc);
      settledEpochs += row.cycleCount ?? 0;
    }

    const totalCount = allSubscribers.length;
    const totalEpochs = settledEpochs + pastDueCount;
    const renewalPct =
      totalEpochs > 0
        ? ((settledEpochs / totalEpochs) * 100).toFixed(settledEpochs === totalEpochs ? 0 : 1)
        : null;

    return {
      totalCount,
      activeCount,
      pastDueCount,
      cancelledCount,
      solanaCancelledCount,
      recentWeekCount,
      settledUsdc: formatUsdc(settledUnits),
      settledEpochs,
      totalEpochs,
      renewalPct,
    };
  }, [allSubscribers, nowMs]);

  const filteredSubscribers = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return allSubscribers.filter((sub) => {
      if (activeTab === "Active" && sub.status !== "Active") return false;
      if (activeTab === "PastDue" && sub.status !== "PastDue") return false;
      if (activeTab === "Cancelled" && sub.status !== "Cancelled") return false;
      if (selectedPlan !== "All" && sub.plan !== selectedPlan) return false;
      if (query && !sub.wallet.toLowerCase().includes(query) && !sub.plan.toLowerCase().includes(query)) {
        return false;
      }
      return true;
    });
  }, [allSubscribers, activeTab, selectedPlan, searchQuery]);

  function findPlanForRow(row: SubscriberRow): PlanSummary | undefined {
    const rowIsNear = row.network === "near";
    return plans.find(
      (p) => (p.name === row.plan || p.id === row.plan) && (p.network === "near") === rowIsNear,
    );
  }

  function handleExportCsv() {
    const headers = [
      "Subscriber",
      "Network",
      "Plan",
      "Status",
      "Cycles Paid",
      "Prepaid Left (USDC)",
      "Total Paid (USDC)",
      "Last Billed (UTC)",
      "Next Renewal (UTC)",
    ];
    const rows = filteredSubscribers.map((row) => [
      row.wallet,
      row.network === "near" ? "NEAR" : "Solana",
      row.plan,
      row.status,
      String(row.cycleCount ?? 0),
      row.prepaidLeftUsdc ?? "",
      row.totalPaidUsdc ?? "0.00",
      row.lastBilledAt,
      row.nextDueAt,
    ]);
    const csv = [headers, ...rows].map((line) => line.map(escapeCsvCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `tidepay-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const tabs: { id: FilterTab; label: string; count: number }[] = [
    { id: "All", label: "All", count: stats.totalCount },
    { id: "Active", label: "Active", count: stats.activeCount },
    { id: "PastDue", label: "Past Due / Grace", count: stats.pastDueCount },
    { id: "Cancelled", label: "Cancelled / Past", count: stats.cancelledCount },
  ];

  const uniquePlanNames = useMemo(() => {
    const seen = new Set<string>();
    return plans.filter((p) => {
      if (seen.has(p.name)) return false;
      seen.add(p.name);
      return true;
    });
  }, [plans]);

  return (
    <div className="flex flex-col gap-6">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">All Subscribers</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Wallets subscribed across your plans with live on-chain status and full cancellation history.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={filteredSubscribers.length === 0}
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <Download className="size-3.5" />
            Export CSV
          </Button>
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

      {/* 4 KPI Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Total All-Time</span>
            <Users className="size-4 text-primary" />
          </div>
          <div className="mt-2.5 flex items-center gap-2.5">
            <span className="text-3xl font-bold tracking-tight text-foreground tabular-nums">
              {stats.totalCount}
            </span>
            {stats.recentWeekCount > 0 && (
              <Badge variant="success" className="rounded-md px-2 py-0.5 text-[11px] font-medium">
                +{stats.recentWeekCount} this week
              </Badge>
            )}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {stats.activeCount} active · {stats.pastDueCount} past-due · {stats.cancelledCount} churned
          </p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Active Subscribers</span>
            <UserCheck className="size-4 text-success" />
          </div>
          <div className="mt-2.5 flex items-center gap-2.5">
            <span className="text-3xl font-bold tracking-tight text-foreground tabular-nums">
              {stats.activeCount}
            </span>
            <Badge variant="neutral" className="rounded-md px-2 py-0.5 text-[11px] font-medium tabular-nums">
              ${stats.settledUsdc} USDC settled
            </Badge>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {stats.activeCount > 0 ? "Auto-pulling via keeper crank" : "Ready for subscriptions"}
          </p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Cancelled / Past</span>
            <UserX className="size-4 text-muted-foreground" />
          </div>
          <div className="mt-2.5 flex items-center gap-2.5">
            <span className="text-3xl font-bold tracking-tight text-foreground tabular-nums">
              {stats.cancelledCount}
            </span>
            {stats.cancelledCount > 0 && (
              <Badge variant="neutral" className="rounded-md px-2 py-0.5 text-[11px] font-medium tabular-nums">
                {stats.solanaCancelledCount > 0
                  ? `${(stats.solanaCancelledCount * EST_SOLANA_RENT_PER_SUB_SOL).toFixed(4)} SOL rent returned`
                  : "Prepaid balance refunded"}
              </Badge>
            )}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Accounts closed &amp; rent refunded
          </p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Renewal Success</span>
            <ShieldCheck className="size-4 text-success" />
          </div>
          <div className="mt-2.5 flex items-center gap-2.5">
            <span className="text-3xl font-bold tracking-tight text-foreground tabular-nums">
              {stats.renewalPct ? `${stats.renewalPct}%` : "—"}
            </span>
            {stats.totalEpochs > 0 && (
              <Badge variant="success" className="rounded-md px-2 py-0.5 text-[11px] font-medium tabular-nums">
                {stats.settledEpochs}/{stats.totalEpochs} epochs
              </Badge>
            )}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {stats.pastDueCount === 0
              ? "0 past-due accounts"
              : `${stats.pastDueCount} past-due account${stats.pastDueCount === 1 ? "" : "s"} in grace period`}
          </p>
        </Card>
      </div>

      {/* Main Subscribers Table Card */}
      <Card className="overflow-hidden">
        {/* Filter Toolbar */}
        <div className="flex flex-col gap-3 border-b px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div
            role="tablist"
            aria-label="Filter subscribers by status"
            className="inline-flex flex-wrap items-center gap-1 rounded-xl border bg-muted/50 p-1 w-fit"
          >
            {tabs.map((tab) => {
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-sm font-semibold"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span>{tab.label}</span>
                  <span
                    className={cn(
                      "rounded-md px-1.5 py-0 text-[10px] font-semibold tabular-nums",
                      isSelected
                        ? "bg-background/20 text-primary-foreground"
                        : "bg-background/70 text-muted-foreground",
                    )}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {uniquePlanNames.length > 0 && (
              <select
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value)}
                aria-label="Filter by plan"
                className="h-9 rounded-lg border border-input bg-background px-3 text-xs font-medium text-foreground outline-none focus-visible:outline-2 focus-visible:outline-ring"
              >
                <option value="All">All Plans ({uniquePlanNames.length})</option>
                {uniquePlanNames.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-2.5 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Search wallet or plan…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 rounded-lg pl-8 text-xs"
              />
            </div>
          </div>
        </div>

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
                    className="mt-1 text-xs"
                  >
                    Clear Filters
                  </Button>
                </div>
              ) : loadingEvents ? (
                "Loading subscriber history on-chain…"
              ) : (
                "No subscribers found yet. Share your Blink URL or checkout link to start collecting subscriptions."
              )}
            </div>
          ) : (
            <Table className="min-w-215">
              <TableHeader>
                <TableRow className="border-t-0 hover:bg-transparent">
                  <TableHead className="text-[11px] uppercase tracking-wider">Subscriber</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider">Plan</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider">Status</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider">Cycles / Runway</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider">Next Renewal</TableHead>
                  <TableHead className="text-right text-[11px] uppercase tracking-wider">Total Paid</TableHead>
                  <TableHead className="text-right text-[11px] uppercase tracking-wider">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubscribers.map((row) => {
                  const rowIsNear = row.network === "near";
                  const matchedPlan = findPlanForRow(row);
                  const explorerHref = rowIsNear
                    ? nearExplorerUrl("address", row.wallet)
                    : explorerUrl("address", row.wallet);
                  const cyclesPaid = row.cycleCount ?? 0;
                  const hasPrepaid = row.prepaidCyclesLeft !== undefined;
                  const totalFundedCycles = hasPrepaid ? cyclesPaid + (row.prepaidCyclesLeft ?? 0) : 0;
                  const progressPct = hasPrepaid
                    ? totalFundedCycles > 0
                      ? Math.min(100, Math.round((cyclesPaid / totalFundedCycles) * 100))
                      : 0
                    : 100;
                  const nextDueMs = row.nextDueAt !== "—" ? Date.parse(row.nextDueAt) : NaN;
                  const dueOverdue = nowMs !== null && Number.isFinite(nextDueMs) && nextDueMs <= nowMs;

                  const barColor =
                    row.status === "Active"
                      ? "bg-success"
                      : row.status === "PastDue"
                        ? "bg-warning"
                        : "bg-muted-foreground/50";

                  return (
                    <TableRow key={row.id || row.wallet}>
                      {/* Subscriber */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "flex size-9 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                              avatarToneFor(row.wallet, row.status === "Cancelled"),
                            )}
                          >
                            {initialsFor(row.wallet)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate font-mono text-xs font-semibold text-foreground">
                                {formatSubscriberLabel(row.wallet, rowIsNear)}
                              </span>
                              <span className="rounded border border-border bg-muted/60 px-1.5 py-0 text-[10px] font-medium text-muted-foreground">
                                {rowIsNear ? "NEAR" : "SOL"}
                              </span>
                              <CopyButton value={row.wallet} label="Copy subscriber address" />
                              <a
                                href={explorerHref}
                                target="_blank"
                                rel="noreferrer"
                                title="View on block explorer"
                                className="inline-flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                              >
                                <ExternalLink className="size-3" />
                              </a>
                            </div>
                            <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                              {rowIsNear ? "NEAR Testnet" : "Solana Devnet"}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Plan */}
                      <TableCell>
                        <div className="flex flex-col items-start gap-1">
                          <Link
                            href={
                              matchedPlan
                                ? planLinks(matchedPlan.id).detailPath(row.plan)
                                : `/plans/${encodeURIComponent(row.plan)}`
                            }
                            className="inline-flex items-center rounded-md border border-border bg-muted/50 px-2.5 py-0.5 font-mono text-xs font-medium text-foreground hover:border-primary/50 hover:text-primary transition-colors"
                          >
                            {row.plan}
                          </Link>
                          {matchedPlan && (
                            <span className="text-[11px] text-muted-foreground tabular-nums">
                              ${matchedPlan.priceUsdc} / {intervalUnit(matchedPlan.intervalSeconds)}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <StatusPill status={row.status} />
                      </TableCell>

                      {/* Cycles / Runway */}
                      <TableCell>
                        <div className="w-36 space-y-1.5">
                          <div className="flex items-baseline justify-between gap-2 text-[11px] tabular-nums">
                            <span className="font-medium text-foreground">
                              {hasPrepaid
                                ? `${cyclesPaid}/${totalFundedCycles} cycles`
                                : `${cyclesPaid} cycle${cyclesPaid === 1 ? "" : "s"}`}
                            </span>
                            <span className="text-muted-foreground">
                              {hasPrepaid
                                ? `$${row.prepaidLeftUsdc ?? "0.00"} left`
                                : row.status === "Cancelled"
                                  ? "Closed"
                                  : "Delegated"}
                            </span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className={cn("h-full rounded-full transition-all", barColor)}
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>

                      {/* Next Renewal */}
                      <TableCell className="whitespace-nowrap text-xs tabular-nums">
                        {row.status === "Cancelled" ? (
                          <span className="text-muted-foreground">Closed</span>
                        ) : row.status === "PastDue" ? (
                          <span className="font-medium text-warning">Retry queued</span>
                        ) : nowMs !== null && Number.isFinite(nextDueMs) ? (
                          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                            <Clock className="size-3.5 text-muted-foreground/80" />
                            {dueOverdue ? "Due now" : formatCountdown(nextDueMs, nowMs)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      {/* Total Paid */}
                      <TableCell className="text-right whitespace-nowrap tabular-nums">
                        <div className="text-xs font-semibold text-foreground">
                          ${row.totalPaidUsdc ?? "0.00"}
                        </div>
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          USDC
                        </div>
                      </TableCell>

                      {/* Action */}
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setInspectedRow(row)}
                          className="h-8 gap-1 rounded-lg px-2.5 text-xs font-medium"
                        >
                          Inspect
                          <ChevronRight className="size-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Subscriber Inspector Modal */}
      {inspectedRow && (
        <SubscriberInspectorModal
          row={inspectedRow}
          plan={findPlanForRow(inspectedRow)}
          onClose={() => setInspectedRow(null)}
        />
      )}
    </div>
  );
}

function SubscriberInspectorModal({
  row,
  plan,
  onClose,
}: {
  row: SubscriberRow;
  plan?: PlanSummary;
  onClose: () => void;
}) {
  const rowIsNear = row.network === "near";
  const planAddress = plan?.id || (row.plan.length > 20 ? row.plan : "");
  const portalLink = planAddress ? planLinks(planAddress).checkout : "";
  const explorerHref = rowIsNear
    ? nearExplorerUrl("address", row.wallet)
    : explorerUrl("address", row.wallet);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Subscriber details"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border bg-card p-5 text-card-foreground shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b pb-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <StatusPill status={row.status} />
              <span className="rounded border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {rowIsNear ? "NEAR Testnet" : "Solana Devnet"}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <p className="truncate font-mono text-sm font-semibold text-foreground">{row.wallet}</p>
              <CopyButton value={row.wallet} label="Copy subscriber address" />
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close inspector"
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <dl className="mt-4 space-y-3 text-xs">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Plan</dt>
            <dd className="font-mono font-medium text-foreground">
              {row.plan}
              {plan ? ` ($${plan.priceUsdc} / ${intervalUnit(plan.intervalSeconds)})` : ""}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Cycles Paid</dt>
            <dd className="font-medium text-foreground tabular-nums">{row.cycleCount ?? 0}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Total Paid</dt>
            <dd className="font-medium text-foreground tabular-nums">${row.totalPaidUsdc ?? "0.00"} USDC</dd>
          </div>
          {row.prepaidLeftUsdc !== undefined && (
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Prepaid Runway</dt>
              <dd className="font-medium text-foreground tabular-nums">
                ${row.prepaidLeftUsdc} USDC ({row.prepaidCyclesLeft ?? 0} cycle{row.prepaidCyclesLeft === 1 ? "" : "s"} left)
              </dd>
            </div>
          )}
          {row.startedAt && (
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Started</dt>
              <dd className="text-foreground tabular-nums">{formatDateTimeUtc(row.startedAt)}</dd>
            </div>
          )}
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Last Billed</dt>
            <dd className="text-foreground tabular-nums">{formatDateTimeUtc(row.lastBilledAt)}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Next Renewal</dt>
            <dd className="text-foreground tabular-nums">
              {row.nextDueAt === "—" ? "— (Closed)" : formatDateTimeUtc(row.nextDueAt)}
            </dd>
          </div>
        </dl>

        <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t pt-4">
          {portalLink && (
            <Button variant="outline" size="sm" asChild className="text-xs">
              <a href={portalLink} target="_blank" rel="noreferrer">
                Checkout Portal
                <ExternalLink className="size-3.5" />
              </a>
            </Button>
          )}
          <Button size="sm" asChild className="text-xs">
            <a href={explorerHref} target="_blank" rel="noreferrer">
              View on Explorer
              <ExternalLink className="size-3.5" />
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
