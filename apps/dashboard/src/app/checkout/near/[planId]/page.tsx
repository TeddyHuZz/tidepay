import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { NearCheckoutCard } from "@/components/checkout/near-checkout-card";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { getNearCheckoutPlan } from "@/lib/data";

export const metadata: Metadata = { title: "Checkout" };

export default function NearCheckoutPage({ params }: PageProps<"/checkout/near/[planId]">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between gap-3 border-b px-4 py-3 md:px-8">
        <Link href="/" className="transition-opacity hover:opacity-80">
          <Logo />
        </Link>
        <ThemeToggle className="size-10" />
      </header>
      <main id="main-content" className="flex flex-1 items-start justify-center px-4 py-10 md:items-center">
        <Suspense fallback={<div className="h-96 w-full max-w-md animate-pulse rounded-lg border bg-card" />}>
          <NearCheckoutContent params={params} />
        </Suspense>
      </main>
    </div>
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
