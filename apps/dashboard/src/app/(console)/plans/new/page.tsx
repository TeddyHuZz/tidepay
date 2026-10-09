import type { Metadata } from "next";
import { PlanForm } from "@/components/plans/plan-form";

export const metadata: Metadata = { title: "New plan" };

export default function NewPlanPage() {
  return <PlanForm />;
}
