import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PlansView } from "@/components/console/plans-view";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Plans" };

export default function PlansPage() {
  return (
    <div className="flex flex-col gap-6 pb-16 md:pb-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Subscription terms your customers can subscribe to.</p>
        <Button asChild className="hidden md:inline-flex">
          <Link href="/plans/new">
            <Plus />
            New plan
          </Link>
        </Button>
      </div>
      <PlansView />

      {/* Mobile Floating Action Button (FAB) */}
      <div className="fixed bottom-6 right-6 z-40 md:hidden">
        <Button asChild size="lg" className="h-12 rounded-full px-4.5 shadow-xl shadow-primary/25 gap-2 font-medium transition-transform active:scale-95">
          <Link href="/plans/new">
            <Plus className="size-5" />
            <span>New plan</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
