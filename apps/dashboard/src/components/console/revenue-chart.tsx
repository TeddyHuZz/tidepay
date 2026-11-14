"use client";

import { useId, useState } from "react";
import type { PlanOnChainEvent } from "@/lib/chain/accounts";
import { DEFAULT_CRANK_BOUNTY_USDC } from "@/lib/chain/config";
import { formatUsdc, parseUsdc } from "@/lib/chain/derive";
import { nearNetPayout } from "@/lib/near/plan-args";
import type { PlanSummary, SubscriberRow } from "@/lib/types";
import { cn } from "@/lib/utils";

const DAY_MS = 86_400_000;
const DAYS = 30;
const CHART_W = 600;
const CHART_H = 200;
const PAD_TOP = 20;
const PAD_BOTTOM = 10;

/**
 * Reconstructs one chart/metric event per paid cycle for NEAR subscribers,
 * since the contract stores cycle_count + last_epoch rather than per-epoch logs.
 */
export function buildNearPlanEvents(subscribers: SubscriberRow[], plans: PlanSummary[]): PlanOnChainEvent[] {
  const events: PlanOnChainEvent[] = [];
  for (const s of subscribers) {
    const count = s.cycleCount ?? 0;
    if (count <= 0 || !s.lastBilledAt) continue;
    const p = plans.find((pl) => pl.id === s.plan || pl.name === s.plan);
    const gross = p ? parseFloat(p.priceUsdc) || 0 : 0;
    const priceUnits = p ? parseUsdc(p.priceUsdc) : null;
    const net =
      priceUnits !== null
        ? formatUsdc(nearNetPayout(priceUnits))
        : Math.max(0, gross * 0.995 - 0.05).toFixed(2);
    const lastMs = new Date(s.lastBilledAt).getTime() || Date.now();
    const startMs = s.startedAt ? new Date(s.startedAt).getTime() : lastMs;
    const intervalMs = (p?.intervalSeconds || 2_592_000) * 1000;

    for (let i = 0; i < count; i++) {
      const isInitial = i === count - 1;
      const at = isInitial && !Number.isNaN(startMs) ? startMs : Math.max(startMs || 0, lastMs - i * intervalMs);
      events.push({
        signature: `${s.id}:${count - i}`,
        kind: isInitial ? "subscribed" : "settled",
        label: isInitial ? "New Subscription" : "Subscription Renewal",
        timestamp: at,
        timeFormatted: new Date(at).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        err: false,
        amountGrossUsdc: gross.toFixed(2),
        amountNetUsdc: net,
        keeperFeeUsdc: DEFAULT_CRANK_BOUNTY_USDC,
        subscriber: s.wallet,
        planName: p?.name || s.plan,
        planAddress: s.plan,
      });
    }
  }
  return events;
}

interface DayBucket {
  dateMs: number;
  amount: number;
  count: number;
}

export function bucketDailyRevenue(events: PlanOnChainEvent[], nowMs: number): DayBucket[] {
  const start = nowMs - DAYS * DAY_MS;
  const buckets: DayBucket[] = Array.from({ length: DAYS }, (_, i) => ({
    dateMs: start + (i + 0.5) * DAY_MS,
    amount: 0,
    count: 0,
  }));

  for (const e of events) {
    const t = e.timestamp < 1e12 ? e.timestamp * 1000 : e.timestamp;
    const day = Math.floor((t - start) / DAY_MS);
    if (day >= 0 && day < DAYS) {
      buckets[day].amount += parseFloat(e.amountNetUsdc?.replace("+", "") || "0") || 0;
      buckets[day].count += 1;
    }
  }
  return buckets;
}

export function RevenueChart({
  events,
  caption,
  captionClassName = "text-sm",
}: {
  events: PlanOnChainEvent[];
  caption?: string;
  captionClassName?: string;
}) {
  const gradientId = useId();
  const [now] = useState(() => Date.now());
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const buckets = bucketDailyRevenue(events, now);
  const hasData = buckets.some((b) => b.amount > 0);
  const max = Math.max(...buckets.map((b) => b.amount), 1);

  const pts = buckets.map((b, i) => {
    const x = (i / (DAYS - 1)) * CHART_W;
    const y = CHART_H - PAD_BOTTOM - (b.amount / max) * (CHART_H - PAD_TOP - PAD_BOTTOM);
    return [x, y] as const;
  });
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return;
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverIdx(Math.round(ratio * (DAYS - 1)));
  };

  const activeBucket = hoverIdx !== null ? buckets[hoverIdx] : null;
  const activePt = hoverIdx !== null ? pts[hoverIdx] : null;
  const leftPct = hoverIdx !== null ? (hoverIdx / (DAYS - 1)) * 100 : 0;
  const topPct = activePt ? (activePt[1] / CHART_H) * 100 : 0;
  const alignClass =
    hoverIdx !== null && hoverIdx > 22
      ? "-translate-x-full -ml-2.5"
      : hoverIdx !== null && hoverIdx < 7
        ? "translate-x-0 ml-2.5"
        : "-translate-x-1/2";

  return (
    <div className="flex flex-1 flex-col justify-between w-full h-full min-h-55">
      <div
        className="relative flex flex-1 items-center justify-center w-full my-4 min-h-42.5 select-none cursor-crosshair"
        onPointerMove={hasData ? handlePointerMove : undefined}
        onPointerLeave={hasData ? () => setHoverIdx(null) : undefined}
      >
        {hasData ? (
          <>
            <svg
              viewBox={`0 0 ${CHART_W} ${CHART_H}`}
              preserveAspectRatio="none"
              className="h-full w-full"
              role="img"
              aria-label="Revenue over the last 30 days"
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {[0.25, 0.5, 0.75].map((f) => (
                <line
                  key={f}
                  x1="0"
                  y1={CHART_H * f}
                  x2={CHART_W}
                  y2={CHART_H * f}
                  stroke="currentColor"
                  strokeDasharray="4 4"
                  className="text-border/30"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              <path d={`${line} L${CHART_W},${CHART_H} L0,${CHART_H} Z`} fill={`url(#${gradientId})`} />
              <path
                d={line}
                fill="none"
                stroke="var(--primary)"
                strokeWidth="2.5"
                vectorEffect="non-scaling-stroke"
                strokeLinejoin="round"
              />
            </svg>

            {/* Unstretched markers for days with settlements */}
            {buckets.map((b, i) =>
              b.amount > 0 && hoverIdx !== i ? (
                <span
                  key={i}
                  aria-hidden="true"
                  style={{ left: `${(i / (DAYS - 1)) * 100}%`, top: `${(pts[i][1] / CHART_H) * 100}%` }}
                  className="pointer-events-none absolute size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/80"
                />
              ) : null,
            )}

            {/* Hover crosshair, active dot, and floating tooltip */}
            {hoverIdx !== null && activeBucket && (
              <>
                <div
                  aria-hidden="true"
                  style={{ left: `${leftPct}%` }}
                  className="pointer-events-none absolute inset-y-0 w-px -translate-x-1/2 bg-border"
                />
                <span
                  aria-hidden="true"
                  style={{ left: `${leftPct}%`, top: `${topPct}%` }}
                  className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary ring-4 ring-primary/25"
                />
                <div
                  role="status"
                  style={{ left: `${leftPct}%`, top: `${Math.min(86, Math.max(8, topPct))}%` }}
                  className={cn(
                    "pointer-events-none absolute z-20 rounded-lg border border-border bg-popover/95 px-2.5 py-1.5 text-xs shadow-lg backdrop-blur-xs whitespace-nowrap",
                    topPct < 45 ? "translate-y-3" : "-translate-y-[calc(100%+10px)]",
                    alignClass,
                  )}
                >
                  <div className="text-[11px] text-muted-foreground">
                    {new Date(activeBucket.dateMs).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </div>
                  <div className={cn("font-semibold tabular-nums", activeBucket.amount > 0 ? "text-primary" : "text-foreground")}>
                    {activeBucket.amount > 0 ? `+${activeBucket.amount.toFixed(2)}` : "0.00"} USDC
                  </div>
                  {activeBucket.count > 0 && (
                    <div className="text-[10px] text-muted-foreground">
                      {activeBucket.count} settlement{activeBucket.count === 1 ? "" : "s"}
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="relative flex flex-1 items-center justify-center w-full h-full min-h-42.5">
            <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full" role="img" aria-label="No revenue yet">
              <line x1="0" y1={CHART_H * 0.25} x2={CHART_W} y2={CHART_H * 0.25} stroke="currentColor" strokeDasharray="4 4" className="text-border/40" strokeWidth="1" />
              <line x1="0" y1={CHART_H * 0.5} x2={CHART_W} y2={CHART_H * 0.5} stroke="currentColor" strokeDasharray="4 4" className="text-border/40" strokeWidth="1" />
              <line x1="0" y1={CHART_H * 0.75} x2={CHART_W} y2={CHART_H * 0.75} stroke="currentColor" strokeDasharray="4 4" className="text-border/40" strokeWidth="1" />
              <line x1="0" y1={CHART_H - 10} x2={CHART_W} y2={CHART_H - 10} stroke="currentColor" className="text-border/80" strokeWidth="1.5" />
            </svg>
            <div className="relative z-10 flex flex-col items-center justify-center text-center px-4">
              <span className="text-sm font-semibold text-foreground/80">0.00 USDC</span>
              <span className="text-xs text-muted-foreground mt-0.5">No on-chain settlements recorded yet</span>
            </div>
          </div>
        )}
      </div>
      <p className={cn("mt-auto text-muted-foreground", captionClassName)}>
        {hasData
          ? (caption ?? "Net settled USDC per day across all active subscriptions.")
          : "Real-time settled revenue — data points appear as subscription epochs settle."}
      </p>
    </div>
  );
}
