"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Search,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Copy,
  Check,
  ArrowLeft,
  BookOpen,
  Terminal,
  ShieldCheck,
  Radio,
  Zap,
  Cpu,
  Layers,
  Code2,
  FileText,
  AlertCircle,
  HelpCircle,
  Menu,
  X,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { CodeBlock } from "@/components/developers/code-block";
import { ApiKeyWebhookManager } from "@/components/developers/api-key-webhook-manager";
import { BlinkTester } from "@/components/developers/blink-tester";
import { PdaConfigViewer } from "@/components/developers/pda-config-viewer";
import { ErrorReferenceTable } from "@/components/developers/error-reference-table";
import { TIDEPAY_PROGRAM_ID } from "@tidepay/types";
import { RPC_URL, USDC_MINT } from "@/lib/chain/config";

// Docs Article Identifiers
export type DocTopicId =
  | "getting-started"
  | "architecture"
  | "quickstart"
  | "sdk-install"
  | "sdk-subscribe"
  | "sdk-gating"
  | "sdk-plans"
  | "sdk-cancel"
  | "actions-spec"
  | "actions-blinks"
  | "crank-keeper"
  | "webhook-simulator"
  | "blink-tester"
  | "pda-config"
  | "anchor-errors"
  | "api-rest";

interface DocGroup {
  name: string;
  defaultOpen?: boolean;
  items: {
    id: DocTopicId;
    title: string;
    description: string;
    keywords: string[];
  }[];
}

const DOC_TREE: DocGroup[] = [
  {
    name: "Start your journey",
    defaultOpen: true,
    items: [
      {
        id: "getting-started",
        title: "Getting started with TidePay",
        description: "Overview of recurring subscription engine on Solana and non-custodial pull architecture.",
        keywords: ["get started", "overview", "introduction", "basics", "solana"],
      },
      {
        id: "architecture",
        title: "Non-custodial Architecture",
        description: "How delegated SPL token allowances and deterministic time-locks replace escrow vaults.",
        keywords: ["architecture", "delegated pull", "security", "time-lock", "re-entrancy"],
      },
      {
        id: "quickstart",
        title: "5-Minute Quickstart",
        description: "Integrate your first recurring plan from zero to production.",
        keywords: ["quickstart", "guide", "tutorial", "fast", "steps"],
      },
    ],
  },
  {
    name: "TypeScript SDK (@tidepay/sdk)",
    defaultOpen: true,
    items: [
      {
        id: "sdk-install",
        title: "Installation & Client Setup",
        description: "Installing packages and configuring TidePayClient with AnchorProvider.",
        keywords: ["install", "pnpm", "npm", "tidepayclient", "provider", "rpc"],
      },
      {
        id: "sdk-subscribe",
        title: "Subscribe a Wallet",
        description: "Delegating token allowance and building on-chain subscribe instructions.",
        keywords: ["subscribe", "delegation", "approve", "transfer_checked", "allowance"],
      },
      {
        id: "sdk-gating",
        title: "Feature Gating & Status",
        description: "Checking active subscription status in API routes and UI components.",
        keywords: ["gating", "check", "subscription", "isactive", "middleware", "auth"],
      },
      {
        id: "sdk-plans",
        title: "Initializing Billing Plans",
        description: "Creating plans with custom intervals, bounties, and merchant token accounts.",
        keywords: ["plan", "create", "initialize", "interval", "bounty", "fee"],
      },
      {
        id: "sdk-cancel",
        title: "Cancelling & Rent Refund",
        description: "Closing subscription accounts and refunding rent lamports to subscribers.",
        keywords: ["cancel", "close", "rent", "refund", "lamports"],
      },
    ],
  },
  {
    name: "Solana Actions & Blinks",
    defaultOpen: true,
    items: [
      {
        id: "actions-spec",
        title: "Action Spec & CORS Headers",
        description: "HTTP endpoint specification for GET and POST Solana Actions.",
        keywords: ["action", "blink", "cors", "v0", "versioned", "spec"],
      },
      {
        id: "actions-blinks",
        title: "Sharing on X & Dial.to",
        description: "Unfurling interactive subscription cards on Twitter, Telegram, and Dial.to.",
        keywords: ["dial.to", "twitter", "unfurl", "share", "card"],
      },
    ],
  },
  {
    name: "Keeper Crank & Relayer",
    defaultOpen: false,
    items: [
      {
        id: "crank-keeper",
        title: "Running a Keeper Crank",
        description: "Autonomous workers settling due epochs and collecting keeper bounties.",
        keywords: ["crank", "keeper", "relayer", "worker", "bot", "bounty", "incentive"],
      },
    ],
  },
  {
    name: "Developer REST API",
    defaultOpen: true,
    items: [
      {
        id: "api-rest",
        title: "Checkout Sessions & Status API",
        description: "Server-to-server endpoints for creating subscription checkout sessions and checking subscriber status.",
        keywords: ["api", "rest", "checkout", "session", "verify", "curl", "endpoint"],
      },
    ],
  },
  {
    name: "Interactive Workbench",
    defaultOpen: true,
    items: [
      {
        id: "webhook-simulator",
        title: "API Keys & Webhooks",
        description: "Generate secret keys, configure webhook endpoints, and test live event dispatches.",
        keywords: ["webhook", "simulator", "tester", "events", "payload", "api key", "secret", "whsec"],
      },
      {
        id: "blink-tester",
        title: "Blink & Dial.to Playground",
        description: "Interactive tester for verifying Action endpoints and Dial.to preview links.",
        keywords: ["blink", "playground", "tester", "dial.to"],
      },
      {
        id: "pda-config",
        title: "Cluster & PDA Reference",
        description: "Live Devnet addresses, seeds, token mints, and RPC endpoints.",
        keywords: ["pda", "config", "seeds", "mint", "program id", "rpc"],
      },
    ],
  },
  {
    name: "Smart Contract Reference",
    defaultOpen: false,
    items: [
      {
        id: "anchor-errors",
        title: "Anchor Error Code Reference",
        description: "Error table with codes 6000-6008, causes, and recommended resolutions.",
        keywords: ["error", "revert", "codes", "epochnotdue", "unauthorized"],
      },
    ],
  },
];

export function DocsView() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#070d10]" />}>
      <DocsContent />
    </Suspense>
  );
}

function DocsContent() {
  const searchParams = useSearchParams();
  const topicParam = searchParams.get("topic") as DocTopicId | null;

  const [activeTopic, setActiveTopic] = useState<DocTopicId>(() => {
    if (topicParam) {
      for (const group of DOC_TREE) {
        if (group.items.some((i) => i.id === topicParam)) return topicParam;
      }
    }
    return "getting-started";
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({
    "Keeper Crank & Relayer": false,
    "Smart Contract Reference": false,
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);

  // Sync activeTopic when URL query param changes and expand parent group
  useEffect(() => {
    if (topicParam) {
      for (const group of DOC_TREE) {
        if (group.items.some((i) => i.id === topicParam)) {
          setActiveTopic(topicParam);
          setCollapsedGroups((prev) => ({ ...prev, [group.name]: false }));
          break;
        }
      }
    }
  }, [topicParam]);

  const selectTopic = (id: DocTopicId) => {
    setActiveTopic(id);
    setMobileMenuOpen(false);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("topic", id);
      window.history.replaceState({}, "", url.toString());
    }
  };

  const toggleGroup = (name: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  // Find active item metadata
  const currentItem = useMemo(() => {
    for (const group of DOC_TREE) {
      for (const item of group.items) {
        if (item.id === activeTopic) return { ...item, groupName: group.name };
      }
    }
    return {
      id: "getting-started" as DocTopicId,
      title: "Getting started with TidePay",
      description: "Overview of recurring subscription engine on Solana and non-custodial pull architecture.",
      groupName: "Start your journey",
    };
  }, [activeTopic]);

  // Search filtering
  const filteredTree = useMemo(() => {
    if (!searchQuery.trim()) return DOC_TREE;
    const q = searchQuery.toLowerCase().trim();

    return DOC_TREE.map((group) => {
      const matched = group.items.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          i.keywords.some((k) => k.includes(q))
      );
      return { ...group, items: matched };
    }).filter((group) => group.items.length > 0);
  }, [searchQuery]);

  // Handle keyboard shortcut for search (/)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        document.getElementById("docs-search-input")?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(`# ${currentItem.title}\n\n${currentItem.description}\n\nOfficial TidePay Documentation (Solana Devnet)`);
    setCopiedMarkdown(true);
    setTimeout(() => setCopiedMarkdown(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#070d10] text-[#e6edf3] font-sans antialiased flex flex-col selection:bg-primary/30 selection:text-white">
      {/* Top GitHub Docs Style Header */}
      <header className="sticky top-0 z-50 border-b border-[#21262d] bg-[#0d1117]/90 backdrop-blur-md">
        <div className="flex h-14 items-center justify-between px-4 lg:px-8 gap-4">
          {/* Left: Brand + Plan Selector */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 text-muted-foreground hover:text-foreground rounded-md border border-[#30363d]"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>

            <Link href="/" className="flex items-center gap-2 outline-none">
              <Logo />
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#161b22] border border-[#30363d] text-[#7ee787] font-mono">
                Docs
              </span>
            </Link>

          </div>

          {/* Center: Global Search Bar */}
          <div className="flex-1 max-w-xl mx-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#8b949e]" />
              <Input
                id="docs-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search docs, SDK methods, webhooks, or error codes..."
                className="h-9 pl-9 pr-9 text-xs bg-[#161b22] border-[#30363d] text-[#c9d1d9] placeholder:text-[#6e7681] focus-visible:ring-1 focus-visible:ring-emerald-500 rounded-md font-mono"
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-[#8b949e] bg-[#21262d] border border-[#30363d] rounded">
                  /
                </kbd>
              </div>
            </div>
          </div>

          {/* Right: Console Jump & GitHub Link */}
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="outline" className="h-8 gap-1.5 text-xs bg-[#161b22] border-[#30363d] hover:bg-[#21262d] text-[#c9d1d9] hover:text-white">
              <Link href="/">
                <ArrowLeft className="size-3.5" />
                <span className="hidden sm:inline">Back to</span> Console
              </Link>
            </Button>

            <Button asChild size="sm" variant="ghost" className="h-8 px-2 text-[#8b949e] hover:text-[#c9d1d9]">
              <a href="https://github.com/TeddyHuZz/tidepay" target="_blank" rel="noreferrer" aria-label="GitHub Repository">
                <svg className="size-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
              </a>
            </Button>
          </div>
        </div>

        {/* GitHub Docs Breadcrumbs bar */}
        <div className="hidden md:flex items-center gap-2 px-8 py-2 text-xs text-[#8b949e] border-t border-[#21262d] bg-[#0d1117]/50 font-mono">
          <Link href="/" className="hover:text-emerald-400 transition-colors">Home</Link>
          <span>/</span>
          <span className="text-[#c9d1d9]">{currentItem.groupName}</span>
          <span>/</span>
          <span className="text-emerald-400 font-medium">{currentItem.title}</span>
        </div>
      </header>

      {/* Main 3-Column Docs Layout */}
      <div className="flex-1 flex max-w-380 w-full mx-auto">
        {/* LEFT SIDEBAR: Topic Tree */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 w-72 bg-[#0d1117] border-r border-[#21262d] p-4 overflow-y-auto pt-20 lg:pt-6 lg:static lg:block shrink-0 transition-transform",
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          )}
        >
          <div className="mb-4 pb-2 border-b border-[#21262d]">
            <span className="text-xs font-bold text-[#f0f6fc] tracking-tight">TidePay Documentation</span>
            <div className="text-[11px] text-[#8b949e] mt-0.5 font-mono">v0.1.0 · Anchor 0.30+</div>
          </div>

          <nav className="flex flex-col gap-5 text-xs">
            {filteredTree.map((group) => {
              const isCollapsed = collapsedGroups[group.name];
              return (
                <div key={group.name} className="flex flex-col gap-1">
                  <button
                    onClick={() => toggleGroup(group.name)}
                    className="flex items-center justify-between text-[11px] font-semibold text-[#8b949e] hover:text-[#c9d1d9] px-2 py-1 uppercase tracking-wider font-mono text-left"
                  >
                    <span>{group.name}</span>
                    {isCollapsed ? <ChevronRight className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                  </button>

                  {!isCollapsed && (
                    <div className="flex flex-col border-l border-[#21262d] ml-2 pl-2 gap-0.5 mt-0.5">
                      {group.items.map((item) => {
                        const isActive = activeTopic === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => selectTopic(item.id)}
                            className={cn(
                              "flex items-center justify-between text-left px-2.5 py-1.5 rounded-md transition-colors leading-snug",
                              isActive
                                ? "bg-[#161b22] text-emerald-400 font-semibold border-l-2 border-emerald-500 -ml-2.25 pl-3.75"
                                : "text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#161b22]/50"
                            )}
                          >
                            <span className="truncate">{item.title}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </aside>

        {/* CENTER COLUMN: Main Article Content */}
        <main className="flex-1 min-w-0 px-6 py-8 md:px-10 lg:px-12 max-w-4xl">
          {/* Article Header */}
          <div className="flex flex-col gap-3 pb-8 border-b border-[#21262d]">
            <h1 className="text-3xl font-extrabold tracking-tight text-[#f0f6fc]">
              {currentItem.title}
            </h1>
            <p className="text-sm text-[#8b949e] leading-relaxed">
              {currentItem.description}
            </p>

            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyMarkdown}
                className="h-7 gap-1.5 text-[11px] bg-[#161b22] border-[#30363d] hover:bg-[#21262d] text-[#c9d1d9]"
              >
                {copiedMarkdown ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                {copiedMarkdown ? "Copied" : "Copy markdown"}
              </Button>
            </div>
          </div>

          {/* Dynamic Article Body */}
          <div className="py-8 flex flex-col gap-10 text-sm text-[#c9d1d9] leading-relaxed">
            {/* TOPIC: Getting Started */}
            {activeTopic === "getting-started" && (
              <>
                <section id="part-1" className="flex flex-col gap-3">
                  <h2 className="text-xl font-bold text-[#f0f6fc] tracking-tight flex items-center gap-2">
                    Part 1: The Recurring Subscription Engine
                  </h2>
                  <p>
                    TidePay is a decentralized subscription infrastructure engine built for the Colosseum Solana Hackathon.
                    Traditional Web3 billing forces users to either manually sign transactions every 30 days or lock upfront capital into escrow contracts. TidePay introduces a <strong>non-custodial delegated pull mechanism</strong>.
                  </p>

                  <div className="rounded-lg border border-[#30363d] bg-[#161b22] p-4 text-xs font-mono text-[#7ee787] flex flex-col gap-1.5">
                    <span className="text-[#8b949e] uppercase font-bold text-[10px]">On-Chain Invariants:</span>
                    <div>✓ Non-Custodial: Funds flow directly from Subscriber ATA to Merchant ATA</div>
                    <div>✓ Time-Locked: clock.unix_timestamp &gt;= record.next_epoch_timestamp</div>
                    <div>✓ Rent Cleanliness: Cancelling closes account and refunds lamports via close = subscriber</div>
                  </div>
                </section>

                <section id="part-2" className="flex flex-col gap-3">
                  <h2 className="text-xl font-bold text-[#f0f6fc] tracking-tight">
                    Part 2: Core Components Overview
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-2 pt-1">
                    <div className="rounded-lg border border-[#30363d] bg-[#161b22] p-4 flex flex-col gap-1.5">
                      <span className="font-bold text-[#f0f6fc] text-xs">1. Anchor Protocol</span>
                      <p className="text-xs text-[#8b949e]">
                        The deployed program on Solana Devnet managing plans, deterministic PDAs, and `transfer_checked` pulls.
                      </p>
                    </div>

                    <div className="rounded-lg border border-[#30363d] bg-[#161b22] p-4 flex flex-col gap-1.5">
                      <span className="font-bold text-[#f0f6fc] text-xs">2. TypeScript SDK</span>
                      <p className="text-xs text-[#8b949e]">
                        `@tidepay/sdk` provides `TidePayClient` for building transactions and verifying feature gating.
                      </p>
                    </div>

                    <div className="rounded-lg border border-[#30363d] bg-[#161b22] p-4 flex flex-col gap-1.5">
                      <span className="font-bold text-[#f0f6fc] text-xs">3. Solana Actions &amp; Blinks</span>
                      <p className="text-xs text-[#8b949e]">
                        Unfurl 1-click subscription checkout cards directly in X (Twitter) feeds and Telegram.
                      </p>
                    </div>

                    <div className="rounded-lg border border-[#30363d] bg-[#161b22] p-4 flex flex-col gap-1.5">
                      <span className="font-bold text-[#f0f6fc] text-xs">4. Keeper Crank Network</span>
                      <p className="text-xs text-[#8b949e]">
                        Decentralized bots continuously scanning for due subscriptions, triggering epoch renewals for a 0.05 USDC bounty.
                      </p>
                    </div>
                  </div>
                </section>

                <section id="part-3" className="flex flex-col gap-3">
                  <h2 className="text-xl font-bold text-[#f0f6fc] tracking-tight">
                    Part 3: Next Steps
                  </h2>
                  <p>
                    To start implementing recurring payments into your dApp, proceed to the installation guide or check our interactive workbench tools.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button size="sm" onClick={() => selectTopic("sdk-install")} className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white">
                      Install TypeScript SDK
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => selectTopic("webhook-simulator")} className="gap-1.5 text-xs bg-[#161b22] border-[#30363d] text-[#c9d1d9]">
                      Open Webhook Tester
                    </Button>
                  </div>
                </section>
              </>
            )}

            {/* TOPIC: Architecture */}
            {activeTopic === "architecture" && (
              <>
                <section id="part-1" className="flex flex-col gap-3">
                  <h2 className="text-xl font-bold text-[#f0f6fc] tracking-tight">
                    1. The Delegated Pull Mechanism
                  </h2>
                  <p>
                    Instead of depositing months of tokens into an escrow vault, subscribers grant a standard SPL Token or Token-2022 delegated allowance (`approve`) to the Program Authority PDA (`b&quot;tidepay_auth&quot;`).
                  </p>
                  <CodeBlock
                    filename="delegation-flow.ts"
                    singleCode={`// The subscriber allows the program authority to pull renewal amounts
createApproveInstruction(
  subscriberTokenAccount,
  programAuthorityPda,
  subscriberPublicKey,
  planAmount * 12n // E.g., pre-authorize 12 cycles
);`}
                  />
                </section>

                <section id="part-2" className="flex flex-col gap-3">
                  <h2 className="text-xl font-bold text-[#f0f6fc] tracking-tight">
                    2. Re-entrancy Protection &amp; State Mutation
                  </h2>
                  <p>
                    On every epoch settlement, the Anchor program increments `cycle_count` and updates `next_epoch_timestamp` <strong>before</strong> the CPI `transfer_checked` call. This completely eliminates re-entrancy vectors.
                  </p>
                </section>
              </>
            )}

            {/* TOPIC: Quickstart */}
            {activeTopic === "quickstart" && (
              <>
                <section id="part-1" className="flex flex-col gap-3">
                  <h2 className="text-xl font-bold text-[#f0f6fc] tracking-tight">
                    Step 1: Install the SDK
                  </h2>
                  <CodeBlock
                    filename="Terminal"
                    tabs={[
                      { label: "pnpm", code: "pnpm add @tidepay/sdk @solana/web3.js @coral-xyz/anchor" },
                      { label: "npm", code: "npm install @tidepay/sdk @solana/web3.js @coral-xyz/anchor" },
                    ]}
                  />
                </section>

                <section id="part-2" className="flex flex-col gap-3">
                  <h2 className="text-xl font-bold text-[#f0f6fc] tracking-tight">
                    Step 2: Check Subscription in 3 Lines
                  </h2>
                  <CodeBlock
                    filename="gatekeeper.ts"
                    singleCode={`import { Connection, PublicKey } from "@solana/web3.js";
import { TidePayClient } from "@tidepay/sdk";

const client = new TidePayClient(new Connection("https://api.devnet.solana.com"));
const [pda] = client.findSubscriptionRecordPda(planPda, userWallet);
const record = await client.getSubscriptionRecord(pda);

const isSubscribed = record?.isActive && (Date.now() / 1000) <= Number(record.nextEpochTimestamp);`}
                  />
                </section>
              </>
            )}

            {/* TOPIC: SDK Install */}
            {activeTopic === "sdk-install" && (
              <>
                <section id="part-1" className="flex flex-col gap-3">
                  <h2 className="text-xl font-bold text-[#f0f6fc] tracking-tight">
                    Package Installation
                  </h2>
                  <p>
                    Install `@tidepay/sdk` alongside `@solana/web3.js`.
                  </p>
                  <CodeBlock
                    filename="Terminal"
                    singleCode="pnpm add @tidepay/sdk @solana/web3.js @coral-xyz/anchor"
                  />
                </section>

                <section id="part-2" className="flex flex-col gap-3">
                  <h2 className="text-xl font-bold text-[#f0f6fc] tracking-tight">
                    Client Configuration
                  </h2>
                  <CodeBlock
                    filename="client.ts"
                    singleCode={`import { Connection } from "@solana/web3.js";
import { TidePayClient } from "@tidepay/sdk";

const connection = new Connection(process.env.SOLANA_RPC_URL!, "confirmed");
export const client = new TidePayClient(connection);`}
                  />
                </section>
              </>
            )}

            {/* TOPIC: SDK Subscribe */}
            {activeTopic === "sdk-subscribe" && (
              <>
                <section id="part-1" className="flex flex-col gap-3">
                  <h2 className="text-xl font-bold text-[#f0f6fc] tracking-tight">
                    Building the Subscribe Instruction
                  </h2>
                  <p>
                    Subscribing delegates SPL token allowance to the Program Authority PDA and pulls Epoch 0 immediately.
                  </p>
                  <CodeBlock
                    filename="subscribe.ts"
                    singleCode={`import { PublicKey, Transaction } from "@solana/web3.js";
import { createApproveInstruction, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { client } from "./client";

export async function createSubscription({ subscriber, planPda, merchantAta, tokenMint, amount }: any) {
  const subscriberAta = getAssociatedTokenAddressSync(tokenMint, subscriber);
  const [programAuthority] = client.findProgramAuthorityPda();

  // 1. Pre-approve 12 months allowance
  const approveIx = createApproveInstruction(subscriberAta, programAuthority, subscriber, amount * 12n);

  // 2. Build subscribe instruction
  const { instruction: subIx, subscriptionPda } = await client.buildSubscribeInstruction({
    subscriber,
    plan: planPda,
    tokenMint,
    subscriberTokenAccount: subscriberAta,
    merchantTokenAccount: merchantAta,
  });

  return new Transaction().add(approveIx, subIx);
}`}
                  />
                </section>
              </>
            )}

            {/* TOPIC: SDK Gating */}
            {activeTopic === "sdk-gating" && (
              <>
                <section id="part-1" className="flex flex-col gap-3">
                  <h2 className="text-xl font-bold text-[#f0f6fc] tracking-tight">
                    Feature Gating Helper
                  </h2>
                  <CodeBlock
                    filename="middleware.ts"
                    singleCode={`import { PublicKey } from "@solana/web3.js";
import { client } from "./client";

export async function checkAccess(planPda: PublicKey, userWallet: PublicKey): Promise<boolean> {
  const [subPda] = client.findSubscriptionRecordPda(planPda, userWallet);
  const record = await client.getSubscriptionRecord(subPda);

  if (!record || !record.isActive) return false;

  // 120s grace period for crank settlement
  const now = BigInt(Math.floor(Date.now() / 1000));
  return now <= (record.nextEpochTimestamp + 120n);
}`}
                  />
                </section>
              </>
            )}

            {/* TOPIC: SDK Plans */}
            {activeTopic === "sdk-plans" && (
              <>
                <section id="part-1" className="flex flex-col gap-3">
                  <h2 className="text-xl font-bold text-[#f0f6fc] tracking-tight">
                    Registering Billing Plans
                  </h2>
                  <CodeBlock
                    filename="init-plan.ts"
                    singleCode={`const { instruction, planPda } = await client.buildInitializePlanInstruction({
  merchant: merchantWallet.publicKey,
  planId: "pro-tier",
  amount: 29_000_000n,          // 29.00 USDC (6 decimals)
  intervalSeconds: 2_592_000n,   // 30 days
  protocolFeeBps: 0,
  crankBountyAmount: 50_000n,    // 0.05 USDC keeper reward
  tokenMint: USDC_MINT,
  merchantTokenAccount: merchantAta,
});`}
                  />
                </section>
              </>
            )}

            {/* TOPIC: SDK Cancel */}
            {activeTopic === "sdk-cancel" && (
              <>
                <section id="part-1" className="flex flex-col gap-3">
                  <h2 className="text-xl font-bold text-[#f0f6fc] tracking-tight">
                    Cancelling &amp; Reclaiming Rent Lamports
                  </h2>
                  <p>
                    The Anchor program closes the account on-chain and directs all rent lamports directly back to the subscriber.
                  </p>
                  <CodeBlock
                    filename="cancel.ts"
                    singleCode={`const { instruction, subscriptionPda } = await client.buildCancelSubscriptionInstruction({
  subscriber: wallet.publicKey,
  plan: planPda,
});`}
                  />
                </section>
              </>
            )}

            {/* TOPIC: Actions Spec */}
            {activeTopic === "actions-spec" && (
              <>
                <section id="part-1" className="flex flex-col gap-3">
                  <h2 className="text-xl font-bold text-[#f0f6fc] tracking-tight">
                    Solana Actions HTTP Spec &amp; CORS
                  </h2>
                  <p>
                    Every Action endpoint requires standard CORS headers to permit Dial.to and Twitter clients to request transaction data.
                  </p>
                  <CodeBlock
                    filename="headers.ts"
                    singleCode={`export const ACTION_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Content-Encoding, Accept-Encoding",
  "Content-Type": "application/json",
};`}
                  />
                </section>
              </>
            )}

            {/* TOPIC: Actions Blinks */}
            {activeTopic === "actions-blinks" && (
              <>
                <section id="part-1" className="flex flex-col gap-3">
                  <h2 className="text-xl font-bold text-[#f0f6fc] tracking-tight">
                    Unfurling on Twitter (X) &amp; Dial.to
                  </h2>
                  <p>
                    By formatting your Action URL into a `dial.to` parameter, any post with the link expands into an interactive Solana Blink:
                  </p>
                  <CodeBlock
                    filename="blink-url.ts"
                    singleCode={`const actionUrl = "https://api.tidepay.xyz/api/actions/subscribe/PLAN_PDA";
const blinkUrl = "https://dial.to/?action=solana-action:" + encodeURIComponent(actionUrl) + "&cluster=devnet";`}
                  />
                </section>
              </>
            )}

            {/* TOPIC: Crank Keeper */}
            {activeTopic === "crank-keeper" && (
              <>
                <section id="part-1" className="flex flex-col gap-3">
                  <h2 className="text-xl font-bold text-[#f0f6fc] tracking-tight">
                    Running the Decentralized Crank Bot
                  </h2>
                  <p>
                    The keeper crank scans for subscribers where `clock.unix_timestamp &gt;= next_epoch_timestamp` and submits `process_epoch` transactions.
                  </p>
                  <CodeBlock
                    filename="Terminal"
                    singleCode="pnpm --filter @tidepay/crank dev"
                  />
                </section>
              </>
            )}

            {/* TOPIC: API Keys & Webhook Manager */}
            {activeTopic === "webhook-simulator" && (
              <div className="flex flex-col gap-6">
                <ApiKeyWebhookManager />
              </div>
            )}

            {/* TOPIC: Blink Tester */}
            {activeTopic === "blink-tester" && (
              <div className="flex flex-col gap-6">
                <BlinkTester />
              </div>
            )}

            {/* TOPIC: PDA Config */}
            {activeTopic === "pda-config" && (
              <div className="flex flex-col gap-6">
                <PdaConfigViewer />
              </div>
            )}

            {/* TOPIC: Anchor Errors */}
            {activeTopic === "anchor-errors" && (
              <div className="flex flex-col gap-6">
                <ErrorReferenceTable />
              </div>
            )}

            {/* TOPIC: Developer REST API */}
            {activeTopic === "api-rest" && (
              <>
                <section id="part-1" className="flex flex-col gap-3">
                  <h2 className="text-xl font-bold text-[#f0f6fc] tracking-tight">
                    1. Create a Checkout Session
                  </h2>
                  <p>
                    Call <code className="text-emerald-400 font-mono">POST /api/v1/checkout/sessions</code> from your backend to generate a personalized subscription URL or Blink with custom metadata.
                  </p>
                  <CodeBlock
                    filename="cURL"
                    singleCode={`curl -X POST https://api.tidepay.xyz/api/v1/checkout/sessions \\
  -H "Content-Type: application/json" \\
  -d '{
    "planAddress": "4g6EF4q95h1pbVG3Gv7AspaZQ6PujFCYCr3eu63RdC6P",
    "clientReferenceId": "usr_99824",
    "successUrl": "https://myapp.com/dashboard?upgraded=true"
  }'`}
                  />
                  <div className="text-xs text-[#8b949e]">Response JSON (HTTP 201 Created):</div>
                  <CodeBlock
                    filename="response.json"
                    singleCode={`{
  "id": "cs_tide_1791624206924_qtsx84h",
  "object": "checkout.session",
  "plan": {
    "address": "4g6EF4q95h1pbVG3Gv7AspaZQ6PujFCYCr3eu63RdC6P",
    "planId": "google-pro",
    "priceUsdc": "0.10",
    "intervalSeconds": 60,
    "isActive": true
  },
  "clientReferenceId": "usr_99824",
  "checkoutUrl": "https://app.tidepay.xyz/checkout/4g6EF4q95h1pbVG3Gv7AspaZQ6PujFCYCr3eu63RdC6P?client_ref=usr_99824",
  "blinkUrl": "https://dial.to/?action=solana-action:https%3A%2F%2Fapi.tidepay.xyz%2Fapi%2Factions%2Fsubscribe%2F4g6EF4q95h1pbVG3Gv7AspaZQ6PujFCYCr3eu63RdC6P&cluster=devnet",
  "expiresAt": 1791627806
}`}
                  />
                </section>

                <section id="part-2" className="flex flex-col gap-3">
                  <h2 className="text-xl font-bold text-[#f0f6fc] tracking-tight">
                    2. Check Subscriber Status &amp; Entitlements
                  </h2>
                  <p>
                    Call <code className="text-emerald-400 font-mono">GET /api/v1/subscriptions/:wallet?plan=:planAddress</code> to gate features or check active subscription state in server environments.
                  </p>
                  <CodeBlock
                    filename="cURL"
                    singleCode={`curl "https://api.tidepay.xyz/api/v1/subscriptions/BZKYKouLsptzcP9Vb4aABEBEzBFZuPpSxpaDjwPGgQio?plan=4g6EF4q95h1pbVG3Gv7AspaZQ6PujFCYCr3eu63RdC6P"`}
                  />
                  <div className="text-xs text-[#8b949e]">Response JSON (Active Subscriber):</div>
                  <CodeBlock
                    filename="response.json"
                    singleCode={`{
  "isSubscribed": true,
  "status": "Active",
  "subscriber": "BZKYKouLsptzcP9Vb4aABEBEzBFZuPpSxpaDjwPGgQio",
  "plan": "4g6EF4q95h1pbVG3Gv7AspaZQ6PujFCYCr3eu63RdC6P",
  "cycleCount": 1,
  "nextBillingDate": "2026-11-10T14:31:00.000Z",
  "isRenewalDue": false
}`}
                  />
                </section>

                <section id="part-3" className="flex flex-col gap-3">
                  <h2 className="text-xl font-bold text-[#f0f6fc] tracking-tight">
                    3. Cancel Subscription (In-App or Server-Side)
                  </h2>
                  <p>
                    Call <code className="text-emerald-400 font-mono">POST /api/v1/subscriptions/cancel</code> when a user clicks &quot;Cancel Subscription&quot; inside your app&apos;s billing settings. It builds the revocation transaction, stops recurring pulls, and refunds ~0.0015 SOL rent lamports to the user&apos;s wallet.
                  </p>
                  <CodeBlock
                    filename="cURL"
                    singleCode={`curl -X POST https://api.tidepay.xyz/api/v1/subscriptions/cancel \\
  -H "Content-Type: application/json" \\
  -d '{
    "planAddress": "4g6EF4q95h1pbVG3Gv7AspaZQ6PujFCYCr3eu63RdC6P",
    "subscriber": "BZKYKouLsptzcP9Vb4aABEBEzBFZuPpSxpaDjwPGgQio"
  }'`}
                  />
                  <div className="text-xs text-[#8b949e]">Response JSON (HTTP 200 OK):</div>
                  <CodeBlock
                    filename="response.json"
                    singleCode={`{
  "status": "prepared",
  "plan": "4g6EF4q95h1pbVG3Gv7AspaZQ6PujFCYCr3eu63RdC6P",
  "subscriber": "BZKYKouLsptzcP9Vb4aABEBEzBFZuPpSxpaDjwPGgQio",
  "subscriptionPda": "6H3z...9kL",
  "rentRefundLamports": 1497960,
  "rentRefundSol": "0.00149796",
  "transaction": "AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA...",
  "message": "Cancellation transaction prepared. Have subscriber sign to revoke billing and receive rent refund."
}`}
                  />
                </section>
              </>
            )}
          </div>
        </main>

        {/* RIGHT SIDEBAR: "IN THIS ARTICLE" / Table of Contents */}
        <aside className="hidden xl:block w-64 p-6 shrink-0 border-l border-[#21262d] text-xs sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto">
          <div className="font-semibold text-[#f0f6fc] mb-3 uppercase tracking-wider text-[11px] font-mono">
            In this article
          </div>
          <div className="flex flex-col gap-2.5 text-[#8b949e]">
            <a href="#part-1" className="hover:text-emerald-400 transition-colors">
              Part 1: Configuring your account
            </a>
            <a href="#part-2" className="hover:text-emerald-400 transition-colors">
              Part 2: Subscribing a wallet
            </a>
            <a href="#part-3" className="hover:text-emerald-400 transition-colors">
              Part 3: Verifying active status
            </a>
            <div className="pt-3 border-t border-[#21262d] mt-2 flex flex-col gap-2">
              <span className="text-[11px] font-semibold text-[#c9d1d9]">Quick tools</span>
              <button
                onClick={() => selectTopic("webhook-simulator")}
                className="text-left hover:text-emerald-400 transition-colors"
              >
                API Keys &amp; Webhooks
              </button>
              <button
                onClick={() => selectTopic("blink-tester")}
                className="text-left hover:text-emerald-400 transition-colors"
              >
                Blink &amp; Dial.to Tester
              </button>
              <button
                onClick={() => selectTopic("anchor-errors")}
                className="text-left hover:text-emerald-400 transition-colors"
              >
                Anchor Errors (6000-6008)
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
