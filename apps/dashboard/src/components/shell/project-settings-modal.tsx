"use client";

import { useState, useEffect } from "react";
import {
  X,
  Sliders,
  Network,
  Clock,
  SunMoon,
  Trash2,
  Check,
  AlertTriangle,
  ExternalLink,
  ShieldAlert,
  Save,
} from "lucide-react";
import { useProject, type Project } from "@/components/project-context";
import { useTheme } from "@/components/theme-provider";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import type { SettingsTab } from "@/components/project-context";

interface ProjectSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: SettingsTab;
}

export function ProjectSettingsModal({ isOpen, onClose, initialTab = "general" }: ProjectSettingsModalProps) {
  const { activeProject, updateActiveProject, projects, deleteProject } = useProject();
  const { theme, setTheme } = useTheme();
  const toast = useToast();

  const [tab, setTab] = useState<SettingsTab>(initialTab);

  // Form State
  const [name, setName] = useState(activeProject.name);
  const [payoutWallet, setPayoutWallet] = useState(activeProject.payoutWallet || activeProject.merchantWallet || "");
  const [customDevnetRpcUrl, setCustomDevnetRpcUrl] = useState(activeProject.customDevnetRpcUrl || "");
  const [customMainnetRpcUrl, setCustomMainnetRpcUrl] = useState(
    activeProject.customMainnetRpcUrl || activeProject.customRpcUrl || ""
  );
  const [explorer, setExplorer] = useState<"solana-explorer" | "solscan" | "solanafm">(
    activeProject.explorer || "solana-explorer"
  );
  const [gracePeriodHours, setGracePeriodHours] = useState<number>(activeProject.gracePeriodHours || 24);

  // Sync state when activeProject changes or modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialTab) setTab(initialTab);
      setName(activeProject.name);
      setPayoutWallet(activeProject.payoutWallet || activeProject.merchantWallet || "");
      setCustomDevnetRpcUrl(activeProject.customDevnetRpcUrl || "");
      setCustomMainnetRpcUrl(activeProject.customMainnetRpcUrl || activeProject.customRpcUrl || "");
      setExplorer(activeProject.explorer || "solana-explorer");
      setGracePeriodHours(activeProject.gracePeriodHours || 24);
    }
  }, [activeProject, isOpen, initialTab]);

  // Handle escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSave = () => {
    updateActiveProject({
      name: name.trim() || activeProject.name,
      payoutWallet: payoutWallet.trim() || undefined,
      customDevnetRpcUrl: customDevnetRpcUrl.trim() || undefined,
      customMainnetRpcUrl: customMainnetRpcUrl.trim() || undefined,
      explorer,
      gracePeriodHours,
    });

    toast.success("Settings saved", `Updated preferences for ${name.trim() || activeProject.name}`);
    onClose();
  };

  const handleDelete = () => {
    if (projects.length <= 1) {
      toast.error("Cannot delete project", "You must have at least one active workspace.");
      return;
    }

    const confirmDelete = window.confirm(
      `Are you sure you want to permanently delete project "${activeProject.name}"? This cannot be undone.`
    );
    if (confirmDelete) {
      deleteProject(activeProject.id);
      toast.success("Project deleted", `Removed ${activeProject.name}`);
      onClose();
    }
  };

  const tabs = [
    { id: "general", label: "General", icon: Sliders },
    { id: "network", label: "RPC & Network", icon: Network },
    { id: "billing", label: "Billing Rules", icon: Clock },
    { id: "appearance", label: "Appearance", icon: SunMoon },
    { id: "danger", label: "Danger Zone", icon: Trash2 },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in-0 duration-150">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-dialog-title"
        className="flex w-full max-w-2xl flex-col rounded-2xl border border-border/80 bg-card text-card-foreground shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sliders className="size-4" />
            </div>
            <div>
              <h2 id="settings-dialog-title" className="text-sm font-bold text-foreground">
                Project Settings
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Configure parameters and preferences for {activeProject.name}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent/60 hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Body (Tabs + Content) */}
        <div className="flex min-h-95 flex-col md:flex-row">
          {/* Navigation Sidebar */}
          <div className="w-full md:w-48 border-b md:border-b-0 md:border-r border-border/60 p-3 flex md:flex-col gap-1 bg-background/40">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors text-left w-full cursor-pointer",
                  tab === id
                    ? "bg-primary/15 text-primary font-semibold"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                  id === "danger" && tab === id && "bg-destructive/15 text-destructive font-semibold"
                )}
              >
                <Icon className={cn("size-3.5", id === "danger" ? "text-destructive" : "")} />
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 p-6 overflow-y-auto max-h-115">
            {/* GENERAL TAB */}
            {tab === "general" && (
              <div className="flex flex-col gap-5">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Project Identity
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Basic information that identifies this workspace.
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-foreground">Project Name</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Acme Subscription Engine"
                    className="text-xs"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-foreground flex items-center justify-between">
                    <span>Project Identifier</span>
                    <Badge variant="neutral" className="text-[10px] font-mono py-0">Auto-Generated</Badge>
                  </label>
                  <div className="rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-xs font-mono text-muted-foreground">
                    {activeProject.id}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-foreground flex items-center justify-between">
                    <span>Settlement Treasury Wallet</span>
                  </label>
                  <Input
                    value={payoutWallet}
                    onChange={(e) => setPayoutWallet(e.target.value)}
                    placeholder="Destination wallet or Squads multisig address"
                    className="text-xs font-mono"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Where subscription revenue is sent. Defaults to your admin merchant wallet.
                  </p>
                </div>
              </div>
            )}

            {/* NETWORK & RPC TAB */}
            {tab === "network" && (
              <div className="flex flex-col gap-5">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    RPC &amp; Network Routing
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Connect dedicated Solana node endpoints for high-throughput crank settlements.
                  </p>
                </div>

                {/* Devnet RPC */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-foreground flex items-center justify-between">
                    <span>Devnet RPC Endpoint</span>
                    <Badge variant="outline" className="text-[10px] py-0 border-primary/30 text-primary">
                      Sandbox / Devnet
                    </Badge>
                  </label>
                  <Input
                    value={customDevnetRpcUrl}
                    onChange={(e) => setCustomDevnetRpcUrl(e.target.value)}
                    placeholder="https://devnet.helius-rpc.com/?api-key=..."
                    className="text-xs font-mono"
                  />
                  {customDevnetRpcUrl.includes("helius-rpc.com") && !customDevnetRpcUrl.includes("api-key") && (
                    <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-[11px] text-amber-300">
                      ⚠️ <strong>Missing API key:</strong> Helius endpoints require <code className="font-mono">?api-key=YOUR_KEY</code> in the URL. Without it, RPC calls will return 401 Unauthorized.
                    </div>
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    Node endpoint used in Sandbox mode and Devnet demo testing. Leave blank for default TidePay RPC.
                  </p>
                </div>

                {/* Mainnet RPC */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-foreground flex items-center justify-between">
                    <span>Mainnet-Beta RPC Endpoint</span>
                    <Badge variant="outline" className="text-[10px] py-0 border-emerald-500/40 text-emerald-400">
                      Live / Mainnet
                    </Badge>
                  </label>
                  <Input
                    value={customMainnetRpcUrl}
                    onChange={(e) => setCustomMainnetRpcUrl(e.target.value)}
                    placeholder="https://mainnet.helius-rpc.com/?api-key=..."
                    className="text-xs font-mono"
                  />
                  {customMainnetRpcUrl.includes("helius-rpc.com") && !customMainnetRpcUrl.includes("api-key") && (
                    <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-[11px] text-amber-300">
                      ⚠️ <strong>Missing API key:</strong> Helius endpoints require <code className="font-mono">?api-key=YOUR_KEY</code> in the URL. Without it, RPC calls will return 401 Unauthorized.
                    </div>
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    Production RPC for live on-chain USDC subscriber payments and Crank execution.
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-foreground">Preferred Block Explorer</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "solana-explorer", name: "Solana Explorer" },
                      { id: "solscan", name: "Solscan" },
                      { id: "solanafm", name: "SolanaFM" },
                    ].map((exp) => (
                      <button
                        key={exp.id}
                        type="button"
                        onClick={() => setExplorer(exp.id as typeof explorer)}
                        className={cn(
                          "rounded-lg border p-2 text-xs font-medium transition-all text-center cursor-pointer",
                          explorer === exp.id
                            ? "border-primary bg-primary/10 text-primary font-semibold"
                            : "border-border/60 bg-background/50 text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                        )}
                      >
                        {exp.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* BILLING RULES TAB */}
            {tab === "billing" && (
              <div className="flex flex-col gap-5">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Subscription Lifecycle Rules
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Control retry policies and decentralized crank incentive bounties.
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-foreground">Failed Settlement Grace Period</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { hours: 24, label: "24 Hours (Standard)" },
                      { hours: 48, label: "48 Hours" },
                      { hours: 72, label: "72 Hours (Generous)" },
                      { hours: 0, label: "Immediate Cancellation" },
                    ].map((opt) => (
                      <button
                        key={opt.hours}
                        type="button"
                        onClick={() => setGracePeriodHours(opt.hours)}
                        className={cn(
                          "rounded-lg border p-2 text-xs font-medium transition-all text-left cursor-pointer",
                          gracePeriodHours === opt.hours
                            ? "border-primary bg-primary/10 text-primary font-semibold"
                            : "border-border/60 bg-background/50 text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    How long a subscriber retains access if their wallet balance is insufficient on due date.
                  </p>
                </div>
              </div>
            )}

            {/* APPEARANCE TAB */}
            {tab === "appearance" && (
              <div className="flex flex-col gap-5">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Interface Theme
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Customize your console visual experience.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTheme("dark")}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all cursor-pointer",
                      theme === "dark"
                        ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary/40"
                        : "border-border/60 bg-background/50 text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                    )}
                  >
                    <div className="size-10 rounded-lg bg-[#021a1b] border border-[#0d5254] flex items-center justify-center text-primary font-bold">
                      🌙
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-foreground">Dark Oceanic</div>
                      <div className="text-[10px] text-muted-foreground">Default TidePay theme</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTheme("light")}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all cursor-pointer",
                      theme === "light"
                        ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary/40"
                        : "border-border/60 bg-background/50 text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                    )}
                  >
                    <div className="size-10 rounded-lg bg-[#f8fafc] border border-[#cfe0de] flex items-center justify-center text-[#008f86] font-bold">
                      ☀️
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-foreground">Light Crisp</div>
                      <div className="text-[10px] text-muted-foreground">Clean daylight mode</div>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* DANGER ZONE TAB */}
            {tab === "danger" && (
              <div className="flex flex-col gap-5">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-destructive mb-1 flex items-center gap-1.5">
                    <ShieldAlert className="size-4" />
                    Danger Zone
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Destructive actions that cannot be reversed. Proceed with caution.
                  </p>
                </div>

                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="text-xs font-bold text-destructive">Delete Project</h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Permanently delete &ldquo;{activeProject.name}&rdquo; and all associated API keys from your workspace.
                      </p>
                    </div>

                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDelete}
                      disabled={projects.length <= 1}
                      className="shrink-0 text-xs"
                    >
                      Delete Project
                    </Button>
                  </div>
                  {projects.length <= 1 && (
                    <p className="text-[10px] text-muted-foreground">
                      * You must have at least two projects to delete the current one.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border/60 px-6 py-3.5 bg-background/50">
          <div className="text-[11px] text-muted-foreground">
            {tab === "danger" ? "Caution: changes may be permanent" : "Click Save to apply changes"}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleSave}
              className="gap-1.5 text-xs font-semibold"
            >
              <Save className="size-3.5" />
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
