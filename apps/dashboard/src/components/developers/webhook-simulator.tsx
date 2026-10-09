"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const EVENTS = {
  "subscription.created": {
    id: "evt_sample_0001",
    type: "subscription.created",
    created: "2026-10-09T12:40:52Z",
    data: {
      plan: "promptpilot-pro",
      subscriber: "3tRw…q7Lm",
      amount: "29.00",
      mint: "USDC",
      cycle: 0,
    },
  },
  "epoch.settled": {
    id: "evt_sample_0002",
    type: "epoch.settled",
    created: "2026-10-09T12:41:08Z",
    data: {
      plan: "promptpilot-pro",
      subscriber: "8fVq…3nKd",
      amount: "29.00",
      mint: "USDC",
      cycle: 4,
      next_epoch: "2026-11-08T12:41:08Z",
    },
  },
} as const;

type EventName = keyof typeof EVENTS;

export function WebhookSimulator() {
  const [selected, setSelected] = useState<EventName>("subscription.created");
  const [sentAt, setSentAt] = useState<string | null>(null);
  const payload = JSON.stringify(EVENTS[selected], null, 2);

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-6">
        <div>
          <CardTitle className="text-base">Webhook simulator</CardTitle>
          <CardDescription className="mt-1">
            Preview the payload your endpoint receives. Sample data only; nothing is sent.
          </CardDescription>
        </div>

        <div role="group" aria-label="Event type" className="flex flex-wrap gap-2">
          {(Object.keys(EVENTS) as EventName[]).map((name) => (
            <button
              key={name}
              type="button"
              aria-pressed={selected === name}
              onClick={() => {
                setSelected(name);
                setSentAt(null);
              }}
              className={cn(
                "h-11 rounded-md border px-3.5 font-mono text-[13px] outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                selected === name
                  ? "border-primary bg-success-soft text-success"
                  : "border-input bg-background text-foreground/80 hover:bg-accent",
              )}
            >
              {name}
            </button>
          ))}
        </div>

        <pre className="overflow-x-auto rounded-md border bg-background p-4 font-mono text-xs leading-5 text-foreground/90">
          <code>{payload}</code>
        </pre>

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={() => setSentAt(selected)}>
            <Send />
            Send test event
          </Button>
          {sentAt && (
            <p role="status" className="text-[13px] text-muted-foreground">
              Simulated {sentAt}. Delivery is not wired up yet.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
