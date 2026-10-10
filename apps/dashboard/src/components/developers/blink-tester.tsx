"use client";

import { useState } from "react";
import { ExternalLink, Zap, Copy, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { API_URL, blinkUrl } from "@/lib/chain/config";

const SAMPLE_PLANS = [
  { id: "4g6EF4q95h1pbVG3Gv7AspaZQ6PujFCYCr3eu63RdC6P", label: "google-pro (Devnet)" },
  { id: "promptpilot-pro", label: "Sample Plan ID" },
];

export function BlinkTester() {
  const [planInput, setPlanInput] = useState(SAMPLE_PLANS[0].id);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const cleanPlan = planInput.trim() || SAMPLE_PLANS[0].id;
  const actionEndpoint = `${API_URL}/api/actions/subscribe/${cleanPlan}`;
  const dialToUrl = blinkUrl(cleanPlan);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(key);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  return (
    <Card className="border-border/70 bg-card/50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Zap className="size-4" />
          </div>
          <div>
            <CardTitle className="text-base font-bold">Blink & Dial.to Tester</CardTitle>
            <CardDescription className="text-xs">
              Test and preview your Solana Action blink before posting to X (Twitter) or embedding in wallets.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-foreground">Plan Address or Plan ID</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              value={planInput}
              onChange={(e) => setPlanInput(e.target.value)}
              placeholder="e.g. 4g6EF4q95h1pbVG3Gv7AspaZQ6PujFCYCr3eu63RdC6P"
              className="font-mono text-xs"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPlanInput(SAMPLE_PLANS[0].id)}
              className="shrink-0 text-xs gap-1"
            >
              <Sparkles className="size-3 text-primary" />
              Use Demo Plan
            </Button>
          </div>
        </div>

        {/* Action URLs */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 rounded-lg border border-border/60 bg-background/50 p-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Solana Action Endpoint (GET / POST)</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(actionEndpoint, "action")}
                className="h-6 px-1.5 text-[11px]"
              >
                {copiedUrl === "action" ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
              </Button>
            </div>
            <code className="break-all font-mono text-[11px] text-muted-foreground select-all">
              {actionEndpoint}
            </code>
          </div>

          <div className="flex flex-col gap-1.5 rounded-lg border border-border/60 bg-background/50 p-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Dial.to Preview URL</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(dialToUrl, "dial")}
                className="h-6 px-1.5 text-[11px]"
              >
                {copiedUrl === "dial" ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
              </Button>
            </div>
            <code className="break-all font-mono text-[11px] text-primary/90 select-all">
              {dialToUrl}
            </code>
          </div>
        </div>

        {/* Live Dial.to launch button & Blink Card simulation */}
        <div className="flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-0.5">
            <div className="text-xs font-semibold text-foreground">Ready to test live with Phantom or Backpack?</div>
            <div className="text-xs text-muted-foreground">
              Dial.to emulates Twitter unfurling with live Devnet wallet transaction signing.
            </div>
          </div>
          <Button asChild size="sm" className="gap-2 shrink-0">
            <a href={dialToUrl} target="_blank" rel="noreferrer">
              Open on Dial.to
              <ExternalLink className="size-3.5" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
