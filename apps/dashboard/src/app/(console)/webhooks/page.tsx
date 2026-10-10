import type { Metadata } from "next";
import { WebhooksView } from "@/components/console/webhooks-view";

export const metadata: Metadata = { title: "Webhooks & API Keys" };

export default function WebhooksPage() {
  return <WebhooksView />;
}
