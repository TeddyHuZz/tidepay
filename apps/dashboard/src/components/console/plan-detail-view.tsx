"use client";

import Link from "next/link";
import { ArrowLeft, ExternalLink, Zap, Users, ShieldCheck, DollarSign, ArrowUpRight } from "lucide-react";
import { MerchantGate } from "@/components/console/merchant-gate";
import { CopyButton } from "@/components/copy-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DEFAULT_CRANK_BOUNTY_USDC, blinkUrl, checkoutUrl } from "@/lib/chain/config";
import { intervalLabel, intervalUnit } from "@/lib/types";

interface PlanDetailViewProps {
  planId: string;
}

export function PlanDetailView({ planId }: PlanDetailViewProps) {
  return (
    <MerchantGate>
      {({ plans, subscribers, activity }) => {
        const decodedParam = decodeURIComponent(planId);
        const plan = plans.find((p) => p.name === decodedParam || p.id === decodedParam);

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
        const hasRenewalHistory = totalEvaluated > 0;
        const successRate = hasRenewalHistory ? `${((activeCount / totalEvaluated) * 100).toFixed(0)}%` : "—";
        
        const priceNum = parseFloat(plan.priceUsdc) || 0;
        const keeperFeeNum = parseFloat(DEFAULT_CRANK_BOUNTY_USDC) || 0.05;
        const netPerCycle = Math.max(0, priceNum - keeperFeeNum).toFixed(2);
        
        // Approximate 30-day normalized MRR
        const cycleSeconds = plan.intervalSeconds || 2_592_000;
        const mrr = ((priceNum * activeCount * 2_592_000) / cycleSeconds).toFixed(2);

        // Filtered activity for this plan
        const planActivity = activity.filter(
          (a) => a.plan === plan.id || a.plan === plan.name,
        );

        const checkoutLink = checkoutUrl(plan.id);
        const actionBlink = blinkUrl(plan.id);
        const embedSnippet = `<iframe src="${checkoutLink}" width="420" height="520" frameborder="0"></iframe>`;

        return (
          <div className="flex flex-col gap-6">
            {/* Top Navigation */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <Button asChild variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground -ml-2">
                <Link href="/plans">
                  <ArrowLeft className="size-4" />
                  Back to plans
                </Link>
              </Button>
              <div className="flex items-center gap-2">
                <Button asChild variant="outline" size="sm" className="gap-1.5">
                  <a href={checkoutLink} target="_blank" rel="noreferrer">
                    Test Checkout
                    <ExternalLink className="size-3.5" />
                  </a>
                </Button>
                <Button asChild size="sm" className="gap-1.5">
                  <a href={actionBlink} target="_blank" rel="noreferrer">
                    Open Blink on Dial.to
                    <Zap className="size-3.5" />
                  </a>
                </Button>
              </div>
            </div>

            {/* Plan Header */}
            <div className="flex flex-col gap-1 rounded-xl border bg-card p-6 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold tracking-tight text-foreground font-mono">{plan.name}</h1>
                  <Badge variant={plan.active ? "success" : "neutral"}>
                    {plan.active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Plan PDA:</span>
                  <code className="font-mono text-foreground/80">{plan.id.slice(0, 8)}...{plan.id.slice(-6)}</code>
                  <CopyButton value={plan.id} label="Copy plan address" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-6 border-t pt-4 md:mt-0 md:border-t-0 md:pt-0">
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Terms</div>
                  <div className="text-xl font-bold text-foreground tabular-nums">
                    {plan.priceUsdc} USDC
                    <span className="text-sm font-normal text-muted-foreground"> / {intervalUnit(plan.intervalSeconds)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stripe-like KPI Performance Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="p-5">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-medium">Monthly Revenue (MRR)</span>
                  <DollarSign className="size-4 text-primary" />
                </div>
                <div className="mt-2 text-2xl font-bold tracking-tight text-foreground tabular-nums">
                  {mrr} USDC
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Normalized across {activeCount} subscriber(s)</p>
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
                  {activeCount > 0 ? "Non-custodial allowances" : "Ready for subscriptions"}
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
                  <span className="text-xs font-medium">Net Payout per Cycle</span>
                  <Zap className="size-4 text-primary" />
                </div>
                <div className="mt-2 text-2xl font-bold tracking-tight text-foreground tabular-nums">
                  {netPerCycle} USDC
                </div>
                <p className="mt-1 text-xs text-muted-foreground">After {DEFAULT_CRANK_BOUNTY_USDC} USDC keeper fee</p>
              </Card>
            </div>

            {/* Two-Column Layout: Details + Integrations & Subscribers */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Left Column: Plan Specifications & Integration */}
              <div className="flex flex-col gap-6 lg:col-span-1">
                {/* Specifications Card */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Plan Specifications</CardTitle>
                    <CardDescription>On-chain parameters settled on Solana Devnet.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col divide-y text-sm">
                    <div className="flex justify-between py-2.5">
                      <span className="text-muted-foreground">Price</span>
                      <span className="font-semibold text-foreground">{plan.priceUsdc} USDC</span>
                    </div>
                    <div className="flex justify-between py-2.5">
                      <span className="text-muted-foreground">Interval</span>
                      <span className="font-semibold text-foreground">{intervalLabel(plan.intervalSeconds)}</span>
                    </div>
                    <div className="flex justify-between py-2.5">
                      <span className="text-muted-foreground">Keeper Reward</span>
                      <span className="font-mono text-muted-foreground">{DEFAULT_CRANK_BOUNTY_USDC} USDC</span>
                    </div>
                    <div className="flex justify-between py-2.5">
                      <span className="text-muted-foreground">Net to Merchant</span>
                      <span className="font-mono font-semibold text-primary">{netPerCycle} USDC</span>
                    </div>
                    <div className="flex justify-between py-2.5">
                      <span className="text-muted-foreground">Accepted Mint</span>
                      <span className="font-mono text-xs text-muted-foreground">USDC (Devnet)</span>
                    </div>
                    <div className="flex justify-between py-2.5">
                      <span className="text-muted-foreground">Settlement Protocol</span>
                      <span className="text-foreground">TidePay v1 (Anchor)</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Integration Hub Card */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Share & Integrations</CardTitle>
                    <CardDescription>Distribute this plan via Blinks, direct link, or embed.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-xs font-medium text-foreground">
                        <span>Solana Action (Blink)</span>
                        <CopyButton value={actionBlink} label="Copy Blink URL" />
                      </div>
                      <code className="break-all rounded-md border bg-background p-2 font-mono text-[11px] text-muted-foreground">
                        {actionBlink}
                      </code>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-xs font-medium text-foreground">
                        <span>Hosted Checkout Link</span>
                        <CopyButton value={checkoutLink} label="Copy checkout link" />
                      </div>
                      <code className="break-all rounded-md border bg-background p-2 font-mono text-[11px] text-muted-foreground">
                        {checkoutLink}
                      </code>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-xs font-medium text-foreground">
                        <span>Website Embed Code</span>
                        <CopyButton value={embedSnippet} label="Copy embed code" />
                      </div>
                      <code className="break-all rounded-md border bg-background p-2 font-mono text-[11px] text-muted-foreground">
                        {embedSnippet}
                      </code>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column: Subscribers List & Activity */}
              <div className="flex flex-col gap-6 lg:col-span-2">
                {/* Subscribers Table */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2.5">
                      <CardTitle className="text-base">Active Subscribers</CardTitle>
                      <Badge variant="outline" className="tabular-nums">
                        {planSubscribers.length} total
                      </Badge>
                    </div>
                    <CardDescription>Wallets subscribed with delegated token allowances.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    {planSubscribers.length === 0 ? (
                      <div className="p-8 text-center text-sm text-muted-foreground">
                        <Users className="mx-auto mb-2 size-8 text-muted-foreground/50" />
                        No active subscribers yet. Share your Blink URL on X or send your checkout link to start collecting subscriptions!
                      </div>
                    ) : (
                      <Table>
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
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Recent Settlements & Events</CardTitle>
                    <CardDescription>On-chain renewal transactions executed by Keeper Cranks.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    {planActivity.length === 0 ? (
                      <div className="p-8 text-center text-sm text-muted-foreground">
                        No transactions recorded for this plan yet. Renewals will log here automatically once subscribers are billed.
                      </div>
                    ) : (
                      <Table>
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
      }}
    </MerchantGate>
  );
}
