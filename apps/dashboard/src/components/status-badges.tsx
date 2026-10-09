import { Badge } from "@/components/ui/badge";
import type { ActivityKind, SubscriptionStatus } from "@/lib/mock-data";

const ACTIVITY_BADGES: Record<ActivityKind, { label: string; variant: "success" | "warning" | "neutral" }> = {
  settled: { label: "Settled", variant: "success" },
  subscribed: { label: "Subscribed", variant: "success" },
  past_due: { label: "Past due", variant: "warning" },
  cancelled: { label: "Cancelled", variant: "neutral" },
};

const STATUS_BADGES: Record<SubscriptionStatus, { label: string; variant: "success" | "warning" | "neutral" }> = {
  Active: { label: "Active", variant: "success" },
  PastDue: { label: "Past due", variant: "warning" },
  Cancelled: { label: "Cancelled", variant: "neutral" },
};

export function ActivityBadge({ kind }: { kind: ActivityKind }) {
  const { label, variant } = ACTIVITY_BADGES[kind];
  return <Badge variant={variant}>{label}</Badge>;
}

export function SubscriptionStatusBadge({ status }: { status: SubscriptionStatus }) {
  const { label, variant } = STATUS_BADGES[status];
  return <Badge variant={variant}>{label}</Badge>;
}
