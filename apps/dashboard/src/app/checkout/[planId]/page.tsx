import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CheckoutCard } from "@/components/checkout/checkout-card";
import { Logo } from "@/components/logo";
import { WalletButton } from "@/components/wallet-button";
import { getCheckoutPlan } from "@/lib/data";

export const metadata: Metadata = { title: "Checkout" };

export default function CheckoutPage({ params }: PageProps<"/checkout/[planId]">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between gap-3 border-b px-4 py-3 md:px-8">
        <Link href="/" className="transition-opacity hover:opacity-80">
          <Logo />
        </Link>
        <div className="flex items-center gap-4">
          <WalletButton />
        </div>
      </header>
      <main id="main-content" className="flex flex-1 items-start justify-center px-4 py-10 md:items-center">
        <Suspense fallback={<div className="h-96 w-full max-w-md animate-pulse rounded-lg border bg-card" />}>
          <CheckoutContent params={params} />
        </Suspense>
      </main>
    </div>
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
