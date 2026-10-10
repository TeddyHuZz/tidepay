"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { USDC_MINT, USDC_DECIMALS, RPC_URL, explorerUrl } from "@/lib/chain/config";
import { TIDEPAY_PROGRAM_ID, PLAN_SEED, SUBSCRIPTION_SEED, AUTH_SEED } from "@tidepay/types";

export function PdaConfigViewer() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const ITEMS = [
    {
      label: "Anchor Program ID",
      value: TIDEPAY_PROGRAM_ID,
      desc: "Deployed TidePay Subscription Engine on Solana Devnet",
      explorer: explorerUrl("address", TIDEPAY_PROGRAM_ID),
    },
    {
      label: "Devnet USDC Mint",
      value: USDC_MINT.toBase58(),
      desc: `Circle Official Devnet Mint (${USDC_DECIMALS} decimals)`,
      explorer: explorerUrl("address", USDC_MINT.toBase58()),
    },
    {
      label: "Active RPC Endpoint",
      value: RPC_URL,
      desc: "Helius high-performance dedicated Devnet RPC cluster",
    },
  ];

  const SEEDS = [
    {
      name: "MerchantPlan PDA",
      seeds: `[b"${PLAN_SEED}", merchant_pubkey.as_ref(), plan_id.as_bytes()]`,
      desc: "Stores plan price, interval seconds, and merchant settlement ATA.",
    },
    {
      name: "SubscriptionRecord PDA",
      seeds: `[b"${SUBSCRIPTION_SEED}", plan_pubkey.as_ref(), subscriber_pubkey.as_ref()]`,
      desc: "Tracks next_epoch_timestamp, cycle_count, and active status.",
    },
    {
      name: "ProgramAuthority PDA",
      seeds: `[b"${AUTH_SEED}"]`,
      desc: "Global non-custodial pull authority PDA delegated for transfer_checked.",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <Card className="border-border/70 bg-card/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="size-4" />
            </div>
            <div>
              <CardTitle className="text-base font-bold">Network & Cluster Parameters</CardTitle>
              <CardDescription className="text-xs">
                Essential on-chain addresses and token metadata for your integrations.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col divide-y divide-border/50">
            {ITEMS.map((item) => (
              <div key={item.label} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-xs font-semibold text-foreground">{item.label}</div>
                  <div className="text-[11px] text-muted-foreground">{item.desc}</div>
                </div>
                <div className="flex items-center gap-1.5 mt-1 sm:mt-0">
                  <code className="font-mono text-xs rounded bg-muted/60 px-2 py-1 text-foreground/90 max-w-60 sm:max-w-xs truncate">
                    {item.value}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(item.value, item.label)}
                    className="h-7 px-2 text-xs"
                    aria-label={`Copy ${item.label}`}
                  >
                    {copiedKey === item.label ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                  </Button>
                  {item.explorer && (
                    <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs">
                      <a href={item.explorer} target="_blank" rel="noreferrer" aria-label={`View ${item.label} on Explorer`}>
                        <ExternalLink className="size-3" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/50">
        <CardHeader>
          <CardTitle className="text-sm font-bold">Deterministic PDA Seed Derivations</CardTitle>
          <CardDescription className="text-xs">
            PDA seeds enforced on-chain by the Anchor runtime. Never hardcode PDAs—derive them deterministically.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {SEEDS.map((s) => (
            <div key={s.name} className="flex flex-col gap-1.5 rounded-lg border border-border/50 bg-background/50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">{s.name}</span>
                <span className="text-[11px] font-mono text-primary">bump: on-chain</span>
              </div>
              <code className="rounded bg-muted/70 px-2 py-1 font-mono text-xs text-primary/90 overflow-x-auto">
                {s.seeds}
              </code>
              <p className="text-[11px] text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
