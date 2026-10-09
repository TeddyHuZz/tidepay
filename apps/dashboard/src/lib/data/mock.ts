// Sample data for NEXT_PUBLIC_USE_SAMPLE_DATA=1 (UI demos before the program is
// deployed). Only src/lib/data/index.ts should import this file.
import type { MerchantData } from "@/lib/types";

export const SAMPLE_DATA: MerchantData = {
  metrics: [
    { label: "Active MRR", value: "1,248.00 USDC", note: "Sample data" },
    { label: "Total subscribers", value: "312", note: "296 active" },
    { label: "Successful pulls", value: "4,806", note: "Across current subscriptions" },
    { label: "Crank uptime", value: "—", note: "Not reported by the crank yet" },
  ],
  activity: [
    { id: "a1", at: "2026-10-09T12:41:08Z", kind: "settled", wallet: "8fVqKd3nKd", plan: "promptpilot-pro", amountUsdc: "+29.00" },
    { id: "a2", at: "2026-10-09T12:40:52Z", kind: "subscribed", wallet: "3tRwxq7Lm", plan: "promptpilot-pro", amountUsdc: "+29.00" },
    { id: "a3", at: "2026-10-09T12:40:08Z", kind: "settled", wallet: "Bk2ZxxP9e", plan: "demo-60s", amountUsdc: "+1.00" },
    { id: "a4", at: "2026-10-09T12:39:41Z", kind: "past_due", wallet: "Hd6Cv1Ya", plan: "promptpilot-team", amountUsdc: "99.00" },
    { id: "a5", at: "2026-10-09T12:38:08Z", kind: "settled", wallet: "9mJs4aTf", plan: "demo-60s", amountUsdc: "+1.00" },
  ],
  crank: [
    { label: "Last pull", value: "12:41:08 UTC" },
    { label: "Next due", value: "in 00:42" },
    { label: "Pending epochs", value: "3" },
  ],
  plans: [
    { id: "promptpilot-pro", name: "promptpilot-pro", priceUsdc: "29.00", intervalSeconds: 2_592_000, subscribers: 212, active: true },
    { id: "promptpilot-team", name: "promptpilot-team", priceUsdc: "99.00", intervalSeconds: 2_592_000, subscribers: 64, active: true },
    { id: "demo-60s", name: "demo-60s", priceUsdc: "1.00", intervalSeconds: 60, subscribers: 36, active: true },
  ],
  subscribers: [
    { id: "s1", wallet: "8fVqKd3nKd", plan: "promptpilot-pro", lastBilledAt: "2026-10-09T12:41:08Z", nextDueAt: "2026-11-08T12:41:08Z", status: "Active" },
    { id: "s2", wallet: "3tRwxq7Lm", plan: "promptpilot-pro", lastBilledAt: "2026-10-09T12:40:52Z", nextDueAt: "2026-11-08T12:40:52Z", status: "Active" },
    { id: "s3", wallet: "Bk2ZxxP9e", plan: "demo-60s", lastBilledAt: "2026-10-09T12:40:08Z", nextDueAt: "2026-10-09T12:41:08Z", status: "Active" },
    { id: "s4", wallet: "Hd6Cv1Ya", plan: "promptpilot-team", lastBilledAt: "2026-09-09T12:39:41Z", nextDueAt: "2026-10-09T12:39:41Z", status: "PastDue" },
  ],
};
