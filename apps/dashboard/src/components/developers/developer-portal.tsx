"use client";

import { useState, useMemo } from "react";
import {
  Code2,
  Terminal,
  Radio,
  Zap,
  ShieldCheck,
  BookOpen,
  Search,
  ExternalLink,
  Layers,
  Sparkles,
  Cpu,
  Coins,
  ArrowRight,
  Package,
  FileCode2,
  AlertTriangle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CodeBlock } from "./code-block";
import { WebhookSimulator } from "./webhook-simulator";
import { BlinkTester } from "./blink-tester";
import { PdaConfigViewer } from "./pda-config-viewer";
import { ErrorReferenceTable } from "./error-reference-table";
import { TIDEPAY_PROGRAM_ID } from "@tidepay/types";

type SectionId =
  | "overview"
  | "webhooks"
  | "blinks"
  | "config"
  | "sdk-setup"
  | "sdk-subscribe"
  | "sdk-gating"
  | "sdk-plans"
  | "sdk-cancel"
  | "actions-spec"
  | "crank-setup"
  | "errors";

interface NavItem {
  id: SectionId;
  label: string;
  badge?: string;
  keywords: string[];
}

interface NavCategory {
  title: string;
  items: NavItem[];
}

const NAV_CATEGORIES: NavCategory[] = [
  {
    title: "WORKBENCH",
    items: [
      { id: "overview", label: "Overview & Architecture", keywords: ["architecture", "flow", "overview", "pull", "non-custodial", "quickstart"] },
      { id: "webhooks", label: "Webhook Simulator", badge: "Interactive", keywords: ["webhook", "simulator", "payload", "events", "json", "post"] },
      { id: "blinks", label: "Blink & Dial.to Tester", badge: "Live", keywords: ["blink", "dial.to", "twitter", "action", "unfurl"] },
      { id: "config", label: "Cluster & PDA Config", keywords: ["config", "cluster", "program id", "rpc", "pda", "usdc", "mint", "seeds"] },
    ],
  },
  {
    title: "TYPESCRIPT SDK",
    items: [
      { id: "sdk-setup", label: "Client Installation", keywords: ["sdk", "install", "pnpm", "npm", "tidepayclient", "provider"] },
      { id: "sdk-subscribe", label: "Subscribe & Delegated Pull", keywords: ["subscribe", "delegation", "approve", "transfer_checked", "token"] },
      { id: "sdk-gating", label: "Feature Gating & Status", keywords: ["gating", "status", "check", "verify", "isactive", "nextepoch"] },
      { id: "sdk-plans", label: "Plan Initialization", keywords: ["plan", "create", "initialize", "interval", "bounty", "fee"] },
      { id: "sdk-cancel", label: "Cancel & Rent Refund", keywords: ["cancel", "close", "rent", "lamports", "refund", "subscriber"] },
    ],
  },
  {
    title: "SOLANA ACTIONS & BLINKS",
    items: [
      { id: "actions-spec", label: "Actions HTTP Spec & CORS", keywords: ["actions", "blinks", "cors", "v0", "versioned", "spec"] },
    ],
  },
  {
    title: "KEEPER CRANK",
    items: [
      { id: "crank-setup", label: "Decentralized Crank Bot", keywords: ["crank", "keeper", "relayer", "bot", "bounty", "cron", "epoch"] },
    ],
  },
  {
    title: "SMART CONTRACT",
    items: [
      { id: "errors", label: "Anchor Error Reference", keywords: ["error", "revert", "code", "anchor", "panic", "pochnotdue"] },
    ],
  },
];

export function DeveloperPortal() {
  const [activeSection, setActiveSection] = useState<SectionId>("overview");
  const [searchQuery, setSearchQuery] = useState("");

  // Search filtering
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return NAV_CATEGORIES;
    const query = searchQuery.toLowerCase().trim();

    return NAV_CATEGORIES.map((cat) => {
      const matchedItems = cat.items.filter(
        (item) =>
          item.label.toLowerCase().includes(query) ||
          item.keywords.some((kw) => kw.includes(query))
      );
      return { ...cat, items: matchedItems };
    }).filter((cat) => cat.items.length > 0);
  }, [searchQuery]);

  return (
    <div className="flex flex-col gap-6">
      {/* Top Banner & Search Header */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-linear-to-b from-card/80 to-card/40 p-6 md:p-8 backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary">
                <Code2 className="size-5" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Developers</h1>
              <Badge variant="outline" className="text-[11px] font-mono border-primary/30 text-primary">
                Devnet Active
              </Badge>
              <Badge variant="neutral" className="text-[11px] font-mono hidden sm:inline-flex">
                Anchor 0.30+
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
              Integrate non-custodial recurring subscriptions on Solana. Use the TypeScript SDK, deploy Solana Action Blinks on X (Twitter), or run decentralized keeper cranks.
            </p>
          </div>

          {/* Quick Stats / Action Links */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveSection("webhooks")}
              className="gap-1.5 text-xs"
            >
              <Radio className="size-3.5 text-primary" />
              Webhook Tester
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveSection("blinks")}
              className="gap-1.5 text-xs"
            >
              <Zap className="size-3.5 text-primary" />
              Blink Playground
            </Button>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="relative mt-2">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search guides, SDK methods (e.g. buildSubscribeInstruction, findProgramAuthorityPda), errors, webhooks…"
            className="pl-10 pr-24 h-11 text-xs bg-background/60 border-border/70 focus-visible:ring-primary/40 font-mono"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground px-2 py-0.5 rounded bg-muted"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Main 2-Column Documentation / Workbench Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left Categorized Navigation Sidebar */}
        <aside className="md:col-span-4 lg:col-span-3 sticky top-4 flex flex-col gap-6 rounded-xl border border-border/60 bg-card/60 p-4 backdrop-blur-sm">
          {filteredCategories.length === 0 ? (
            <div className="text-center py-6 text-xs text-muted-foreground">
              No matching developer topics found for &quot;{searchQuery}&quot;.
            </div>
          ) : (
            filteredCategories.map((cat) => (
              <div key={cat.title} className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold tracking-wider text-muted-foreground/80 px-2 uppercase font-mono">
                  {cat.title}
                </span>
                <div className="flex flex-col gap-0.5">
                  {cat.items.map((item) => {
                    const isActive = activeSection === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActiveSection(item.id)}
                        className={cn(
                          "flex items-center justify-between rounded-lg px-2.5 py-2 text-xs text-left transition-colors outline-none",
                          isActive
                            ? "bg-primary/10 text-primary font-semibold border border-primary/20"
                            : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                        )}
                      >
                        <span className="truncate">{item.label}</span>
                        {item.badge && (
                          <span
                            className={cn(
                              "text-[10px] font-mono px-1.5 py-0.5 rounded-full ml-1",
                              isActive
                                ? "bg-primary/20 text-primary"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </aside>

        {/* Right Content Panel */}
        <div className="md:col-span-8 lg:col-span-9 flex flex-col gap-8">
          {/* SECTION: Overview & Architecture */}
          {activeSection === "overview" && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground">Overview & Architecture</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Non-custodial recurring subscription settlement on Solana.
                </p>
              </div>

              {/* 3 Pillars of TidePay */}
              <div className="grid gap-4 sm:grid-cols-3">
                <Card className="p-4 border-border/60 bg-card/40">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 mb-2">
                    <ShieldCheck className="size-4" />
                  </div>
                  <h3 className="text-xs font-bold text-foreground">Non-Custodial Delegated Pull</h3>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                    TidePay never holds user funds in escrow vaults. Billing uses delegated SPL token allowance (`transfer_checked`) directly to merchant ATAs.
                  </p>
                </Card>

                <Card className="p-4 border-border/60 bg-card/40">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary mb-2">
                    <Cpu className="size-4" />
                  </div>
                  <h3 className="text-xs font-bold text-foreground">Deterministic Time-Locks</h3>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                    Pulls are strictly enforced on-chain via `clock.unix_timestamp &gt;= next_epoch_timestamp`. No client-side manipulation is possible.
                  </p>
                </Card>

                <Card className="p-4 border-border/60 bg-card/40">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 mb-2">
                    <Coins className="size-4" />
                  </div>
                  <h3 className="text-xs font-bold text-foreground">Decentralized Crank Incentives</h3>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                    Anyone can run a keeper crank bot to settle due epochs and earn 0.05 USDC per processed renewal, paid straight from the merchant revenue.
                  </p>
                </Card>
              </div>

              {/* Architecture Diagram Box */}
              <Card className="border-border/60 bg-muted/40 p-5 font-mono text-xs">
                <div className="text-muted-foreground text-[11px] mb-2 uppercase tracking-wider font-semibold">
                  Lifecycle Workflow
                </div>
                <div className="rounded border border-border/40 bg-background/50 p-4 text-foreground/90 leading-loose text-[11px] overflow-x-auto">
                  <div>1. Subscriber delegates token allowance to Program Authority PDA (`b&quot;tidepay_auth&quot;`)</div>
                  <div>2. Subscriber calls `subscribe()`, transferring Epoch 0 fee immediately to Merchant</div>
                  <div>3. On-chain `SubscriptionRecord` PDA is initialized with `next_epoch_timestamp`</div>
                  <div>4. Time advances &rarr; Epoch becomes due &rarr; Keeper crank calls `process_epoch()`</div>
                  <div>5. Subscriber can call `cancel_subscription()` at any time &rarr; PDA is closed &amp; rent lamports refunded</div>
                </div>
              </Card>

              {/* Quick Jump Buttons */}
              <div className="flex flex-wrap gap-3 pt-2">
                <Button size="sm" onClick={() => setActiveSection("sdk-setup")} className="gap-1.5 text-xs">
                  <Package className="size-3.5" />
                  Install TypeScript SDK
                  <ArrowRight className="size-3" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setActiveSection("blinks")} className="gap-1.5 text-xs">
                  <Zap className="size-3.5 text-primary" />
                  Solana Actions / Blinks
                </Button>
              </div>
            </div>
          )}

          {/* SECTION: Webhook Simulator */}
          {activeSection === "webhooks" && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground">Webhook Simulator & Tester</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Simulate and inspect automated subscription events dispatched to your backend server.
                </p>
              </div>

              <WebhookSimulator />

              <Card className="border-border/60 bg-card/40 p-5">
                <CardTitle className="text-xs font-bold text-foreground">Verifying Webhook Signatures</CardTitle>
                <CardDescription className="text-xs mt-1">
                  In production, every webhook contains an `X-TidePay-Signature` header computed with HMAC-SHA256 over the raw body.
                </CardDescription>
                <div className="mt-3">
                  <CodeBlock
                    language="typescript"
                    singleCode={`import crypto from "crypto";

export function verifyWebhook(rawBody: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac("sha256", secret);
  const expected = hmac.update(rawBody).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}`}
                  />
                </div>
              </Card>
            </div>
          )}

          {/* SECTION: Blink & Dial.to Tester */}
          {activeSection === "blinks" && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground">Solana Actions & Blinks Playground</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Share recurring subscriptions across X (Twitter) posts, Telegram, Discord, and Dial.to clients.
                </p>
              </div>

              <BlinkTester />

              <Card className="border-border/60 bg-card/40 p-5">
                <CardTitle className="text-xs font-bold text-foreground">How Blinks Work for Subscriptions</CardTitle>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  When a user pastes your plan URL on X or Dial.to, the client requests your Action metadata (`GET /api/actions/subscribe/[plan]`). When the user clicks &quot;Subscribe&quot;, the client submits a `POST` with their wallet public key, receives a pre-signed `VersionedTransaction` with Token-2022 / SPL approve instructions, and prompts the user for 1-click execution.
                </p>
              </Card>
            </div>
          )}

          {/* SECTION: Cluster & PDA Config */}
          {activeSection === "config" && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground">Cluster & PDA Configuration</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Active Solana Devnet program IDs, token mints, and seed derivation rules.
                </p>
              </div>

              <PdaConfigViewer />
            </div>
          )}

          {/* SECTION: SDK Setup */}
          {activeSection === "sdk-setup" && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground">Client Installation & Setup</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Add the official `@tidepay/sdk` package to your frontend or backend TypeScript project.
                </p>
              </div>

              <CodeBlock
                filename="Terminal"
                tabs={[
                  { label: "pnpm", code: "pnpm add @tidepay/sdk @solana/web3.js @coral-xyz/anchor" },
                  { label: "npm", code: "npm install @tidepay/sdk @solana/web3.js @coral-xyz/anchor" },
                  { label: "yarn", code: "yarn add @tidepay/sdk @solana/web3.js @coral-xyz/anchor" },
                ]}
              />

              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-semibold text-foreground">Initializing TidePayClient</h3>
                <CodeBlock
                  filename="tidepay.ts"
                  language="typescript"
                  singleCode={`import { Connection } from "@solana/web3.js";
import { TidePayClient } from "@tidepay/sdk";

// Initialize with your Helius or Solana RPC endpoint
const connection = new Connection(process.env.SOLANA_RPC_URL!, "confirmed");

// Optional: Pass standard AnchorProvider or wallet adapter for signing
export const tidePay = new TidePayClient(connection);`}
                />
              </div>
            </div>
          )}

          {/* SECTION: SDK Subscribe */}
          {activeSection === "sdk-subscribe" && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground">Subscribe & Delegated Pull</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Delegate token pull allowance and initialize the on-chain recurring subscription.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Before subscribing, the subscriber grants an SPL token allowance (`createApproveInstruction`) to the Program Authority PDA. This allows the smart contract to pull future renewals safely without needing the user&apos;s private key.
                </p>
              </div>

              <CodeBlock
                filename="subscribe.ts"
                language="typescript"
                singleCode={`import { PublicKey, Transaction } from "@solana/web3.js";
import { createApproveInstruction, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { tidePay } from "./tidepay";

export async function createSubscription({
  subscriber,
  planPda,
  merchantAta,
  tokenMint,
  planAmount,
}: {
  subscriber: PublicKey;
  planPda: PublicKey;
  merchantAta: PublicKey;
  tokenMint: PublicKey;
  planAmount: bigint;
}) {
  const subscriberAta = getAssociatedTokenAddressSync(tokenMint, subscriber);
  const [programAuthority] = tidePay.findProgramAuthorityPda();

  // 1. Delegate 12 billing cycles of allowance to TidePay Program Authority PDA
  const approveIx = createApproveInstruction(
    subscriberAta,
    programAuthority,
    subscriber,
    planAmount * 12n
  );

  // 2. Build on-chain subscribe instruction (pulls Epoch 0 immediately)
  const { instruction: subscribeIx, subscriptionPda } = await tidePay.buildSubscribeInstruction({
    subscriber,
    plan: planPda,
    tokenMint,
    subscriberTokenAccount: subscriberAta,
    merchantTokenAccount: merchantAta,
  });

  const tx = new Transaction().add(approveIx, subscribeIx);
  return { tx, subscriptionPda };
}`}
              />
            </div>
          )}

          {/* SECTION: Feature Gating */}
          {activeSection === "sdk-gating" && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground">Feature Gating & Status Verification</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Check whether a connected wallet has an active, paid-up subscription.
                </p>
              </div>

              <CodeBlock
                filename="gate.ts"
                language="typescript"
                singleCode={`import { PublicKey } from "@solana/web3.js";
import { tidePay } from "./tidepay";

export async function isWalletSubscribed(planPda: PublicKey, userWallet: PublicKey): Promise<boolean> {
  const [subscriptionPda] = tidePay.findSubscriptionRecordPda(planPda, userWallet);
  const record = await tidePay.getSubscriptionRecord(subscriptionPda);

  if (!record || !record.isActive) {
    return false;
  }

  // Allow a 120-second grace window for the decentralized crank to process renewals
  const currentUnix = BigInt(Math.floor(Date.now() / 1000));
  const graceWindow = 120n;
  
  return currentUnix <= (record.nextEpochTimestamp + graceWindow);
}`}
              />

              <Card className="border-border/60 bg-card/40 p-4">
                <div className="text-xs font-semibold text-foreground">Edge Middleware / Next.js Server Actions</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Because `findSubscriptionRecordPda` is deterministic, you can derive the PDA and check access directly on your API routes without querying a centralized SQL database.
                </p>
              </Card>
            </div>
          )}

          {/* SECTION: SDK Plans */}
          {activeSection === "sdk-plans" && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground">Plan Initialization</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Programmatically register recurring plans from your own backend or contracts.
                </p>
              </div>

              <CodeBlock
                filename="create-plan.ts"
                language="typescript"
                singleCode={`import { PublicKey } from "@solana/web3.js";
import { tidePay } from "./tidepay";

export async function createPlanInstruction({
  merchant,
  merchantAta,
  tokenMint,
}: {
  merchant: PublicKey;
  merchantAta: PublicKey;
  tokenMint: PublicKey;
}) {
  const { instruction, planPda } = await tidePay.buildInitializePlanInstruction({
    merchant,
    planId: "enterprise-monthly",
    amount: 99_000_000n,          // 99.00 USDC (6 decimals)
    intervalSeconds: 2_592_000n,   // 30 days (minimum 60s)
    protocolFeeBps: 0,             // 0 bps
    crankBountyAmount: 50_000n,    // 0.05 USDC keeper reward per epoch
    tokenMint,
    merchantTokenAccount: merchantAta,
  });

  return { instruction, planPda };
}`}
              />
            </div>
          )}

          {/* SECTION: SDK Cancel */}
          {activeSection === "sdk-cancel" && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground">Cancellation & Rent Lamport Refund</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  How cancellations are processed with non-custodial rent reclamation.
                </p>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                When a user cancels, the TidePay Anchor program automatically executes `close = subscriber`. The `SubscriptionRecord` PDA is deleted and all rent lamports are directly returned to the subscriber&apos;s wallet.
              </p>

              <CodeBlock
                filename="cancel.ts"
                language="typescript"
                singleCode={`import { PublicKey } from "@solana/web3.js";
import { tidePay } from "./tidepay";

export async function cancelSubscription(subscriber: PublicKey, planPda: PublicKey) {
  const { instruction, subscriptionPda } = await tidePay.buildCancelSubscriptionInstruction({
    subscriber,
    plan: planPda,
  });

  return { instruction, subscriptionPda };
}`}
              />
            </div>
          )}

          {/* SECTION: Actions Spec */}
          {activeSection === "actions-spec" && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground">Solana Actions HTTP Spec & Headers</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Required CORS headers and response formats for Solana Actions / Blinks.
                </p>
              </div>

              <CodeBlock
                filename="route.ts"
                language="typescript"
                singleCode={`// Standard Action Headers required for Dial.to and Twitter clients
export const ACTION_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Content-Encoding, Accept-Encoding",
  "Content-Type": "application/json",
};

// GET Response: Action Metadata
export function getActionMetadata() {
  return {
    icon: "https://tidepay.xyz/icon.png",
    title: "Subscribe to Pro Tier",
    description: "29 USDC / month recurring billing on Solana.",
    label: "Subscribe",
    links: {
      actions: [
        { label: "Subscribe (1 Month)", href: "/api/actions/subscribe/..." }
      ]
    }
  };
}`}
              />
            </div>
          )}

          {/* SECTION: Crank Setup */}
          {activeSection === "crank-setup" && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground">Decentralized Keeper Crank Bot</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Run a worker node that triggers epoch renewals and earns keeper bounties.
                </p>
              </div>

              <CodeBlock
                filename="Terminal"
                language="bash"
                singleCode={`# Start the keeper crank worker in the protocol repository
pnpm --filter @tidepay/crank dev`}
              />

              <Card className="border-border/60 bg-card/40 p-5">
                <CardTitle className="text-xs font-bold text-foreground">Keeper Reward Economics</CardTitle>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  Every time `process_epoch` is executed for a due subscriber, the Anchor program splits the payment:
                  the merchant receives `(amount - crank_bounty)`, and the crank caller&apos;s ATA receives `crank_bounty` (default 0.05 USDC).
                </p>
              </Card>
            </div>
          )}

          {/* SECTION: Anchor Errors */}
          {activeSection === "errors" && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground">Anchor Error Code Reference</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Complete listing of custom error codes and resolutions.
                </p>
              </div>

              <ErrorReferenceTable />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
