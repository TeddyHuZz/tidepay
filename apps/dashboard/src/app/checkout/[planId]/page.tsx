import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckoutCard } from "@/components/checkout/checkout-card";
import { CheckoutLoadingSkeleton } from "@/components/checkout/checkout-shell";
import { getCheckoutPlan } from "@/lib/data";

export const metadata: Metadata = { title: "Checkout" };

export default function CheckoutPage({ params }: PageProps<"/checkout/[planId]">) {
  return (
    <Suspense fallback={<CheckoutLoadingSkeleton chainLabel="SOLANA DEVNET" />}>
      <CheckoutContent params={params} />
    </Suspense>
  );
}

async function CheckoutContent({ params }: { params: PageProps<"/checkout/[planId]">["params"] }) {
  const { planId } = await params;
  const plan = await getCheckoutPlan(planId);
  if (!plan) notFound();

  return (
    <CheckoutCard
      planAddress={plan.id}
      merchant={plan.merchant}
      name={plan.name}
      priceUsdc={plan.priceUsdc}
      intervalSeconds={plan.intervalSeconds}
      active={plan.active}
      isSample={plan.isSample}
    />
  );
}
