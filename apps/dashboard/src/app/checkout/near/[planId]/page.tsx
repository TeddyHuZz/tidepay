import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NearCheckoutCard } from "@/components/checkout/near-checkout-card";
import { CheckoutLoadingSkeleton } from "@/components/checkout/checkout-shell";
import { getNearCheckoutPlan } from "@/lib/data";

export const metadata: Metadata = { title: "Checkout" };

export default function NearCheckoutPage({ params }: PageProps<"/checkout/near/[planId]">) {
  return (
    <Suspense fallback={<CheckoutLoadingSkeleton chainLabel="NEAR TESTNET" />}>
      <NearCheckoutContent params={params} />
    </Suspense>
  );
}

async function NearCheckoutContent({ params }: { params: PageProps<"/checkout/near/[planId]">["params"] }) {
  const { planId } = await params;
  const plan = await getNearCheckoutPlan(planId);
  if (!plan) notFound();

  return (
    <NearCheckoutCard
      planId={planId}
      merchant={plan.merchant ?? ""}
      name={plan.name}
      priceUsdc={plan.priceUsdc}
      intervalSeconds={plan.intervalSeconds}
      active={plan.active}
    />
  );
}
