import type { Metadata } from "next";
import { SubscribersView } from "@/components/console/subscribers-view";

export const metadata: Metadata = { title: "Subscribers" };

export default function SubscribersPage() {
  return (
    <div className="flex flex-col gap-6">
      <p className="max-w-2xl text-sm text-muted-foreground">
        Wallets subscribed to your plans, with their next renewal. Only a subscriber can cancel; cancelling closes
        their subscription account and refunds its rent to them.
      </p>
      <SubscribersView />
    </div>
  );
}
