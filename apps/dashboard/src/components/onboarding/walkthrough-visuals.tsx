"use client";

import type { ReactNode } from "react";
import { Wallet, ShieldCheck, Store, Zap, Cpu, Send, MessageCircle, Code2, Repeat } from "lucide-react";

const KEYFRAMES = `
@keyframes tp-travel { 0% { left: 4%; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { left: 92%; opacity: 0; } }
@keyframes tp-fill { 0% { width: 0%; } 85% { width: 100%; } 100% { width: 100%; } }
@keyframes tp-rise { 0%, 80% { transform: translateY(6px); opacity: 0; } 90% { transform: translateY(0); opacity: 1; } 100% { transform: translateY(-14px); opacity: 0; } }
@keyframes tp-pop { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.06); } }
@media (prefers-reduced-motion: reduce) {
  .tp-anim { animation: none !important; }
}
`;

function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="relative h-40 w-full overflow-hidden rounded-xl border border-border/60 bg-background/60 p-4">
      <style>{KEYFRAMES}</style>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,color-mix(in_srgb,var(--primary)_10%,transparent),transparent_70%)] pointer-events-none" />
      <div className="relative flex h-full items-center justify-center">{children}</div>
    </div>
  );
}

function Node({ icon: Icon, label, tone }: { icon: typeof Wallet; label: string; tone: string }) {
  return (
    <div className="z-10 flex w-24 flex-col items-center gap-1.5">
      <div className={`flex size-11 items-center justify-center rounded-xl border ${tone}`}>
        <Icon className="size-5" />
      </div>
      <span className="text-center text-[10px] font-medium leading-tight text-muted-foreground">{label}</span>
    </div>
  );
}

function NonCustodialVisual() {
  return (
    <Frame>
      <div className="relative flex w-full max-w-md items-center justify-between">
        <Node icon={Wallet} label="Subscriber wallet (funds stay here)" tone="border-primary/30 bg-primary/10 text-primary" />
        <Node icon={ShieldCheck} label="TidePay program (no vault)" tone="border-emerald-500/30 bg-emerald-500/10 text-emerald-400" />
        <Node icon={Store} label="Merchant wallet" tone="border-amber-500/30 bg-amber-500/10 text-amber-400" />
        <div className="pointer-events-none absolute inset-x-8 top-5.5 h-px bg-border" />
        <span
          className="tp-anim absolute top-4 size-3 rounded-full bg-primary shadow-[0_0_12px] shadow-primary"
          style={{ animation: "tp-travel 3s ease-in-out infinite" }}
        />
      </div>
    </Frame>
  );
}

function PlanVisual() {
  return (
    <Frame>
      <div className="w-full max-w-xs rounded-xl border border-border/70 bg-card p-3.5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-foreground">Pro Plan</p>
            <p className="font-mono text-[10px] text-muted-foreground">10 USDC / 60s (test)</p>
          </div>
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
            Active
          </span>
        </div>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-accent/60">
          <div className="tp-anim h-full rounded-full bg-primary" style={{ animation: "tp-fill 4s linear infinite" }} />
        </div>
        <div className="mt-1.5 flex items-center justify-between font-mono text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><Repeat className="size-3" /> next epoch</span>
          <span>on-chain PDA</span>
        </div>
      </div>
    </Frame>
  );
}

function DistributionVisual() {
  return (
    <Frame>
      <div className="flex w-full max-w-md items-center gap-4">
        <div className="w-44 shrink-0 rounded-xl border border-border/70 bg-card p-3 shadow-sm">
          <p className="text-[10px] text-muted-foreground">@merchant on X</p>
          <p className="mt-1 text-[11px] font-semibold text-foreground">Subscribe to Pro</p>
          <div
            className="tp-anim mt-2 flex items-center justify-center gap-1 rounded-md bg-primary py-1.5 text-[10px] font-semibold text-primary-foreground"
            style={{ animation: "tp-pop 1.8s ease-in-out infinite" }}
          >
            <Zap className="size-3 fill-current" /> Subscribe · 10 USDC
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          {[
            { icon: Zap, label: "Blink on X" },
            { icon: Send, label: "Telegram" },
            { icon: MessageCircle, label: "Discord" },
            { icon: Code2, label: "Embed widget" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 rounded-md border border-border/60 bg-card/60 px-2 py-1 text-[10px] text-muted-foreground">
              <Icon className="size-3 text-primary" />
              {label}
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

function CrankVisual() {
  return (
    <Frame>
      <div className="relative w-full max-w-sm">
        <div className="flex items-center gap-3">
          <div className="relative flex size-11 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
            <Cpu className="size-5" />
            <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between text-[10px] font-medium text-muted-foreground">
              <span>Keeper watching next_epoch_timestamp</span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-accent/60">
              <div className="tp-anim h-full rounded-full bg-amber-400" style={{ animation: "tp-fill 4s linear infinite" }} />
            </div>
          </div>
        </div>
        <div
          className="tp-anim absolute -top-5 right-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] text-emerald-400"
          style={{ animation: "tp-rise 4s ease-out infinite" }}
        >
          +0.05 USDC bounty
        </div>
        <p className="mt-4 text-center font-mono text-[10px] text-muted-foreground">epoch due → process_epoch → merchant paid</p>
      </div>
    </Frame>
  );
}

export const WALKTHROUGH_VISUALS = [NonCustodialVisual, PlanVisual, DistributionVisual, CrankVisual];
