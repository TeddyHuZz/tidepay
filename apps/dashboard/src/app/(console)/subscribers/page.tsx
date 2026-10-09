import type { Metadata } from "next";
import { SubscriptionStatusBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTimeUtc, shortAddress } from "@/lib/format";
import { listSubscribers } from "@/lib/data";

export const metadata: Metadata = { title: "Subscribers" };

export default async function SubscribersPage() {
  const subscribers = await listSubscribers();

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">Wallets subscribed to your plans, with their next renewal.</p>

      <Card>
        <Table className="min-w-[760px]">
          <TableHeader>
            <TableRow className="border-t-0 hover:bg-transparent">
              <TableHead>Subscriber wallet</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Last billed</TableHead>
              <TableHead>Next due epoch</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subscribers.map((row) => (
              <TableRow key={`${row.wallet}-${row.plan}`}>
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
                  <Button
                    variant="outline"
                    size="sm"
                    disabled
                    title="Available once @tidepay/sdk exposes cancel()"
                  >
                    Cancel subscription
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
