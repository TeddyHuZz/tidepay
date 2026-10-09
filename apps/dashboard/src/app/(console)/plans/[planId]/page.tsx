import { Suspense } from "react";
import type { Metadata } from "next";
import { PlanDetailView } from "@/components/console/plan-detail-view";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ planId: string }>;
}): Promise<Metadata> {
  const { planId } = await params;
  return {
    title: `${decodeURIComponent(planId)} · Plans`,
  };
}

export default function PlanDetailPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading plan details">
          <div className="h-9 w-28 animate-pulse rounded border bg-card" />
          <div className="h-24 w-full animate-pulse rounded-xl border bg-card" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-lg border bg-card" />
            ))}
          </div>
          <div className="h-64 w-full animate-pulse rounded-xl border bg-card" />
        </div>
      }
    >
      <PlanDetailContent params={params} />
    </Suspense>
  );
}

async function PlanDetailContent({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;
  return <PlanDetailView planId={planId} />;
}
