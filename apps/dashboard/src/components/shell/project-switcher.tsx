"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  ChevronDown,
  ChevronUp,
  Settings,
  Package,
  Plus,
  User,
  LogOut,
  Check,
  Copy,
  ChevronRight,
  Sparkles,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { shortAddress } from "@/lib/format";
import { useProject, type Project } from "@/components/project-context";
import { useToast } from "@/components/ui/toast";
import { ProjectSettingsModal } from "./project-settings-modal";

export function ProjectSwitcher() {
  const { publicKey, disconnect, connected } = useWallet();
  const {
    projects,
    activeProject,
    switchProject,
    createProject,
    toggleEnvironment,
    isSettingsOpen,
    settingsInitialTab,
    openSettingsModal,
    closeSettingsModal,
  } = useProject();

  const [isOpen, setIsOpen] = useState(false);
  const [switchingTo, setSwitchingTo] = useState<Project | null>(null);
  const [view, setView] = useState<"menu" | "switch" | "create">("menu");
  const [newProjectName, setNewProjectName] = useState("");
  const [copiedWallet, setCopiedWallet] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setView("menu");
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
        setView("menu");
      }
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const getInitials = (name: string) => {
    const cleaned = name.replace(/[()]/g, "").trim();
    const parts = cleaned.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return cleaned.slice(0, 2).toUpperCase() || "TP";
  };

  const handleSelectProject = (projectId: string) => {
    if (projectId === activeProject.id) {
      setView("menu");
      setIsOpen(false);
      return;
    }

    const target = projects.find((p) => p.id === projectId);
    if (!target) return;

    setIsOpen(false);
    setSwitchingTo(target);

    setTimeout(() => {
      switchProject(projectId);
      setSwitchingTo(null);
      setView("menu");
      toast.success("Switched workspace", `Active project set to "${target.name}"`);
    }, 550);
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newProjectName.trim();
    if (!name) return;
    createProject(name);
    setNewProjectName("");
    setView("menu");
    setIsOpen(false);
    toast.success("Project created", `Created and switched to workspace "${name}"`);
  };

  const handleCopyWallet = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!publicKey) return;
    navigator.clipboard.writeText(publicKey.toBase58());
    setCopiedWallet(true);
    setTimeout(() => setCopiedWallet(false), 2000);
  };

  const handleDisconnect = async () => {
    try {
      // Clear legacy global keys to prevent ghost projects leaking across sessions
      try {
        localStorage.removeItem("tidepay_projects_v2");
        localStorage.removeItem("tidepay_active_project_v2");
      } catch {
        // Ignore local storage error
      }
      await disconnect();
      setIsOpen(false);
    } catch (err) {
      console.error("[TidePay] Disconnect error:", err);
    }
  };

  return (
    <div ref={containerRef} className="relative z-40 w-full">
      {/* Trigger Button (placed below the TidePay logo) */}
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => {
          setIsOpen(!isOpen);
          setView("menu");
        }}
        className={cn(
          "flex w-full items-center justify-between gap-2.5 rounded-xl border p-2 text-left transition-all outline-none",
          isOpen
            ? "border-primary/50 bg-primary/10 text-foreground shadow-sm ring-1 ring-primary/30"
            : "border-border/60 bg-card/60 text-muted-foreground hover:border-border hover:bg-accent/50 hover:text-foreground"
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Avatar box (initials) */}
          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-background border border-border/80 font-semibold text-xs text-foreground shadow-xs">
            {activeProject.name.slice(0, 1).toUpperCase()}
          </div>

          <div className="flex flex-col min-w-0 leading-tight">
            <span className="text-xs font-semibold text-foreground truncate">
              {activeProject.name}
            </span>
            <span className="text-[11px] text-muted-foreground truncate">
              TidePay {activeProject.environment}
            </span>
          </div>
        </div>

        {isOpen ? (
          <ChevronUp className="size-4 shrink-0 text-primary" />
        ) : (
          <ChevronDown className="size-4 shrink-0 text-muted-foreground/80" />
        )}
      </button>

      {/* Floating Popover Menu (Matching Axiom / Vercel style) */}
      {isOpen && (
        <div
          role="menu"
          aria-label="Project Switcher Menu"
          className="absolute top-full left-0 mt-2 w-72 origin-top-left rounded-2xl border border-border/80 bg-popover text-popover-foreground p-3.5 shadow-2xl backdrop-blur-xl animate-in fade-in-0 zoom-in-95 duration-150 z-50 flex flex-col gap-3 text-xs"
        >
          {view === "menu" && (
            <>
              {/* Header Box: Avatar + Project Name + Exit sandbox */}
              <div className="flex flex-col items-center justify-center text-center pb-2 pt-1">
                <div className="flex size-11 items-center justify-center rounded-xl bg-muted border border-border/70 text-primary font-bold text-sm shadow-xs mb-2">
                  {getInitials(activeProject.name)}
                </div>

                <div className="font-bold text-sm text-foreground tracking-tight">
                  {activeProject.name}
                </div>

                <div className="text-[11px] text-muted-foreground mt-0.5">
                  TidePay {activeProject.environment}
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleEnvironment();
                  }}
                  className="mt-3 w-full rounded-lg border border-border/70 bg-secondary/80 py-1.5 px-3 text-xs font-medium text-secondary-foreground hover:bg-accent hover:text-accent-foreground hover:border-border transition-colors shadow-xs cursor-pointer"
                >
                  {activeProject.environment === "sandbox" ? "Exit sandbox" : "Enter sandbox"}
                </button>
              </div>

              {/* Main Actions */}
              <div className="flex flex-col gap-0.5 border-t border-border/50 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    openSettingsModal("general");
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-muted-foreground hover:bg-accent/60 hover:text-foreground transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <Settings className="size-4 text-muted-foreground" />
                    <span>Settings</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setView("switch")}
                  className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-muted-foreground hover:bg-accent/60 hover:text-foreground transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Package className="size-4 text-muted-foreground" />
                    <span>Switch project</span>
                  </div>
                  <ChevronRight className="size-3.5 text-muted-foreground/60" />
                </button>

                <button
                  type="button"
                  onClick={() => setView("create")}
                  className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-muted-foreground hover:bg-accent/60 hover:text-foreground transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Plus className="size-4 text-muted-foreground" />
                    <span>Create project</span>
                  </div>
                  <ChevronRight className="size-3.5 text-muted-foreground/60" />
                </button>
              </div>

              {/* User Row & Sign out */}
              <div className="flex flex-col gap-0.5 border-t border-border/50 pt-2">
                <div className="flex items-center justify-between rounded-lg px-2.5 py-2 text-muted-foreground">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <User className="size-4 shrink-0 text-muted-foreground" />
                    <span className="font-mono text-foreground truncate">
                      {publicKey ? shortAddress(publicKey.toBase58(), 4) : "swenfei"}
                    </span>
                  </div>

                  {connected && publicKey && (
                    <button
                      type="button"
                      onClick={handleCopyWallet}
                      title="Copy wallet address"
                      className="hover:text-foreground p-1 text-muted-foreground/80 hover:bg-accent/50 rounded cursor-pointer"
                    >
                      {copiedWallet ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors text-left cursor-pointer"
                >
                  <LogOut className="size-4" />
                  <span>Sign out</span>
                </button>
              </div>
            </>
          )}

          {/* Switch Project Subview */}
          {view === "switch" && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between pb-1 border-b border-border/50">
                <span className="font-semibold text-foreground text-xs">Switch Project</span>
                <button
                  type="button"
                  onClick={() => setView("menu")}
                  className="text-[11px] text-primary hover:underline cursor-pointer"
                >
                  Back
                </button>
              </div>

              <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                {projects.map((proj) => {
                  const isCurrent = proj.id === activeProject.id;
                  return (
                    <button
                      key={proj.id}
                      type="button"
                      onClick={() => handleSelectProject(proj.id)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left transition-colors cursor-pointer",
                        isCurrent
                          ? "bg-primary/10 text-primary font-semibold border border-primary/20"
                          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="flex size-5 shrink-0 items-center justify-center rounded bg-background border border-border/60 text-[10px]">
                          {proj.name[0]}
                        </div>
                        <span className="truncate">{proj.name}</span>
                      </div>
                      {isCurrent && <Check className="size-3.5 text-primary shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Create Project Subview */}
          {view === "create" && (
            <form onSubmit={handleCreateProject} className="flex flex-col gap-3">
              <div className="flex items-center justify-between pb-1 border-b border-border/50">
                <span className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                  <Sparkles className="size-3 text-primary" />
                  New Project
                </span>
                <button
                  type="button"
                  onClick={() => setView("menu")}
                  className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-medium text-muted-foreground">
                  Project Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. DeFi Analytics"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  autoFocus
                  className="rounded-lg border border-border bg-background/80 px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground/60"
                />
              </div>

              <button
                type="submit"
                disabled={!newProjectName.trim()}
                className="w-full rounded-lg bg-primary py-1.5 px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
              >
                Create Project
              </button>
            </form>
          )}
        </div>
      )}

      {/* Switching Project Loading Modal */}
      {switchingTo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-md animate-in fade-in-0 duration-200">
          <div className="flex flex-col items-center gap-3.5 rounded-2xl border border-border/80 bg-card p-6 shadow-2xl text-center max-w-xs w-full animate-in zoom-in-95 duration-150">
            <div className="relative flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Loader2 className="size-6 animate-spin" />
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-semibold text-foreground">
                Switching Workspace
              </h3>
              <p className="text-xs text-muted-foreground">
                Connecting to <span className="font-medium text-foreground">{switchingTo.name}</span>...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Project Settings Modal */}
      <ProjectSettingsModal
        isOpen={isSettingsOpen}
        onClose={closeSettingsModal}
        initialTab={settingsInitialTab}
      />
    </div>
  );
}
