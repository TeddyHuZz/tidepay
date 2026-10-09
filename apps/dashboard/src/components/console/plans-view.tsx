"use client";

import Link from "next/link";
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
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow className="border-t-0 hover:bg-transparent">
                  <TableHead>Plan ID</TableHead>
                  <TableHead>Price (USDC)</TableHead>
                  <TableHead>Interval</TableHead>
                  <TableHead>Subscribers</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Share</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="font-medium">{plan.name}</TableCell>
                    <TableCell className="tabular-nums">{plan.priceUsdc}</TableCell>
                    <TableCell className="text-foreground/80">{intervalLabel(plan.intervalSeconds)}</TableCell>
                    <TableCell className="tabular-nums">{plan.subscribers}</TableCell>
                    <TableCell>
                      <Badge variant={plan.active ? "success" : "neutral"}>{plan.active ? "Active" : "Inactive"}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-3">
                        <Link href={`/checkout/${plan.id}`} className="text-primary hover:underline">
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
