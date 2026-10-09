import type { Metadata } from "next";
import { DemoApp } from "@/components/demo/demo-app";

export const metadata: Metadata = { title: "PromptPilot AI demo" };

export default function DemoPage() {
  return <DemoApp />;
}
