import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listPlans } from "@/lib/data";
import { getInterval } from "@/lib/types";

export const metadata: Metadata = { title: "Plans" };

export default async function PlansPage() {
  const plans = await listPlans();

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
            {plans.map((plan) => (
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
        )}
      </Card>
    </div>
  );
}
