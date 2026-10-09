import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PlansView } from "@/components/console/plans-view";
import { Button } from "@/components/ui/button";

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
      <PlansView />
    </div>
  );
}
