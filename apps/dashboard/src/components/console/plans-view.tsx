"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { MerchantGate } from "@/components/console/merchant-gate";
import { CopyButton } from "@/components/copy-button";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { blinkUrl } from "@/lib/chain/config";
import { intervalLabel } from "@/lib/types";

export function PlansView() {
  return (
    <MerchantGate>
      {({ plans }) => (
        <Card>
          {plans.length === 0 ? (
            <EmptyState
              title="No plans yet"
              description="Create your first plan to get a shareable Blink link and checkout page."
              action={
                <Button asChild>
                  <Link href="/plans/new">Create a plan</Link>
                </Button>
              }
            />
          ) : (
            <Table className="min-w-180">
              <TableHeader>
                <TableRow className="border-t-0 hover:bg-transparent">
                  <TableHead>Plan ID</TableHead>
                  <TableHead>Price (USDC)</TableHead>
                  <TableHead>Interval</TableHead>
                  <TableHead>Subscribers</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => (
                  <TableRow key={plan.id} className="group">
                    <TableCell className="font-medium">
                      <Link
                        href={`/plans/${encodeURIComponent(plan.name)}`}
                        className="inline-flex items-center gap-1 font-mono font-medium text-foreground hover:text-primary transition-colors"
                      >
                        <span>{plan.name}</span>
                        <ArrowUpRight className="size-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    </TableCell>
                    <TableCell className="tabular-nums font-mono">{plan.priceUsdc}</TableCell>
                    <TableCell className="text-foreground/80">{intervalLabel(plan.intervalSeconds)}</TableCell>
                    <TableCell className="tabular-nums font-mono">{plan.subscribers}</TableCell>
                    <TableCell>
                      <Badge variant={plan.active ? "success" : "neutral"}>{plan.active ? "Active" : "Inactive"}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/plans/${encodeURIComponent(plan.name)}`}
                          className="text-xs font-semibold text-primary hover:underline"
                        >
                          Details
                        </Link>
                        <Link href={`/checkout/${plan.id}`} className="text-xs text-muted-foreground hover:text-foreground">
                          Checkout
                        </Link>
                        <CopyButton value={blinkUrl(plan.id)} label={`Copy Blink URL for ${plan.name}`} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      )}
    </MerchantGate>
  );
}
