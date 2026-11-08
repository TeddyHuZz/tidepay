import type { Metadata } from "next";
import { PlanForm } from "@/components/plans/plan-form";

export const metadata: Metadata = { title: "New plan" };

export default async function NewPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ network?: string }>;
}) {
  const { network } = await searchParams;
  return <PlanForm initialNetwork={network === "near" ? "near" : "solana"} />;
}
