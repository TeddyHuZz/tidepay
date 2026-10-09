import Link from "next/link";
import { Plus } from "lucide-react";
import { ActivityBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatTimeUtc, shortAddress } from "@/lib/format";
import { ACTIVITY, CRANK_STATUS, METRICS } from "@/lib/mock-data";

export default function OverviewPage() {
  return (
    <div className="flex flex-col gap-7">
      <section aria-label="Key metrics" className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-4">
        {METRICS.map((metric) => (
          <Card key={metric.label} className="flex flex-col gap-2 p-5">
            <div className="text-[13px] text-muted-foreground">{metric.label}</div>
            <div className="text-[28px] font-semibold leading-[34px] tracking-tight tabular-nums">{metric.value}</div>
            <div className="text-xs text-muted-foreground">{metric.note}</div>
          </Card>
        ))}
      </section>

      <div className="flex flex-wrap items-start gap-6">
        <Card className="min-w-0 flex-[999_1_520px]">
          <CardHeader>
            <CardTitle>Recent billing activity</CardTitle>
            <Link href="/subscribers" className="text-[13px] text-primary hover:underline">
              View subscribers
            </Link>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow className="border-t-0 hover:bg-transparent">
                <TableHead>Time (UTC)</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Subscriber</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="text-right">Amount (USDC)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ACTIVITY.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                    {formatTimeUtc(event.at)}
                  </TableCell>
                  <TableCell>
                    <ActivityBadge kind={event.kind} />
                  </TableCell>
                  <TableCell className="font-mono text-xs">{shortAddress(event.wallet)}</TableCell>
                  <TableCell className="text-foreground/80">{event.plan}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{event.amountUsdc}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-4">
          <Card>
            <CardContent className="flex flex-col gap-3.5">
              <CardTitle>Quick actions</CardTitle>
              <p className="text-sm text-muted-foreground">
                Set the price and billing interval, then share the Blink link with subscribers.
              </p>
              <Button asChild>
                <Link href="/plans/new">
                  <Plus />
                  Create New Plan
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col">
              <CardTitle className="mb-2.5">Keeper crank</CardTitle>
              {CRANK_STATUS.map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-3 border-t py-2 text-sm">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="font-mono text-[13px]">{row.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
