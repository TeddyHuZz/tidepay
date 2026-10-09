"use client";

import { MerchantGate } from "@/components/console/merchant-gate";
import { EmptyState } from "@/components/empty-state";
import { SubscriptionStatusBadge } from "@/components/status-badges";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { explorerUrl } from "@/lib/chain/config";
import { formatDateTimeUtc, shortAddress } from "@/lib/format";

export function SubscribersView() {
  return (
    <MerchantGate>
      {({ subscribers }) => (
        <Card>
          {subscribers.length === 0 ? (
            <EmptyState
              title="No subscribers yet"
              description="Share a plan's Blink link or checkout page and subscribers will show up here."
            />
          ) : (
            <Table className="min-w-[760px]">
              <TableHeader>
                <TableRow className="border-t-0 hover:bg-transparent">
                  <TableHead>Subscriber wallet</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Last billed</TableHead>
                  <TableHead>Next due epoch</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Explorer</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscribers.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">{shortAddress(row.wallet)}</TableCell>
                    <TableCell className="text-foreground/80">{row.plan}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDateTimeUtc(row.lastBilledAt)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDateTimeUtc(row.nextDueAt)}
                    </TableCell>
                    <TableCell>
                      <SubscriptionStatusBadge status={row.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <a
                        href={explorerUrl("address", row.id)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline"
                      >
                        View<span className="sr-only"> subscription for {row.wallet}</span>
                      </a>
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
