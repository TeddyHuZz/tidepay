import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PLANS, getInterval } from "@/lib/mock-data";

export const metadata: Metadata = { title: "Plans" };

export default function PlansPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Subscription terms your customers can subscribe to.</p>
        <Button asChild>
          <Link href="/plans/new">
            <Plus />
            New plan
          </Link>
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow className="border-t-0 hover:bg-transparent">
              <TableHead>Plan</TableHead>
              <TableHead>Price (USDC)</TableHead>
              <TableHead>Interval</TableHead>
              <TableHead>Subscribers</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Checkout</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {PLANS.map((plan) => (
              <TableRow key={plan.id}>
                <TableCell className="font-medium">{plan.name}</TableCell>
                <TableCell className="tabular-nums">{plan.priceUsdc}</TableCell>
                <TableCell className="text-foreground/80">{getInterval(plan.interval).label}</TableCell>
                <TableCell className="tabular-nums">{plan.subscribers}</TableCell>
                <TableCell>
                  <Badge variant={plan.active ? "success" : "neutral"}>{plan.active ? "Active" : "Inactive"}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Link href={`/checkout/${plan.id}`} className="text-primary hover:underline">
                    Open
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
