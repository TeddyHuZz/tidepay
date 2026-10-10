import type { Metadata } from "next";
import { DocsView } from "@/components/docs/docs-view";

export const metadata: Metadata = {
  title: "TidePay Documentation",
  description: "Official developer documentation, TypeScript SDK, Solana Actions Blinks, and architecture guides for TidePay.",
};

export default function DevelopersDocsPage() {
  return <DocsView />;
}
