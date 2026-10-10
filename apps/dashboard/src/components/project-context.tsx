"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

export interface Project {
  id: string;
  name: string;
  slug: string;
  environment: "sandbox" | "live";
  planIds: string[];
  merchantWallet?: string;
  secretKey?: string;
  publishableKey?: string;
  signingSecret?: string;
  webhookUrl?: string;
  payoutWallet?: string;
  customRpcUrl?: string;
  customDevnetRpcUrl?: string;
  customMainnetRpcUrl?: string;
  explorer?: "solana-explorer" | "solscan" | "solanafm";
  gracePeriodHours?: number;
}

export function generateRandomHex(length: number): string {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const bytes = new Uint8Array(Math.ceil(length / 2));
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("").slice(0, length);
  }
  return Array.from({ length }, () => Math.floor(Math.random() * 16).toString(16)).join("");
}

export function stableHex(seed: string, length: number): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  let out = "";
  for (let i = 0; i < length; i++) {
    const v = Math.abs((seed.charCodeAt(i % seed.length) * 31 + i * 17 + hash) % 16);
    out += v.toString(16);
  }
  return out;
}

export function ensureProjectKeys(proj: Project & { settings?: Record<string, unknown> }): Project {
  const prefix = proj.environment === "live" ? "live" : "dev";
  const secretKey = proj.secretKey || `tp_${prefix}_sec_${stableHex(proj.id + "_sec", 24)}`;
  const publishableKey = proj.publishableKey || `tp_${prefix}_pub_${stableHex(proj.id + "_pub", 24)}`;
  const signingSecret = proj.signingSecret || `whsec_${stableHex(proj.id + "_wh", 20)}`;
  const webhookUrl = proj.webhookUrl || "https://api.yourdomain.com/webhooks/tidepay";

  const settings = proj.settings || {};

  return {
    ...proj,
    secretKey,
    publishableKey,
    signingSecret,
    webhookUrl,
    customDevnetRpcUrl: proj.customDevnetRpcUrl || (settings.customDevnetRpcUrl as string) || undefined,
    customMainnetRpcUrl: proj.customMainnetRpcUrl || (settings.customMainnetRpcUrl as string) || undefined,
    explorer: proj.explorer || (settings.explorer as Project["explorer"]) || undefined,
    gracePeriodHours: proj.gracePeriodHours ?? (settings.gracePeriodHours as number) ?? undefined,
  };
}

export function createDefaultProjectForWallet(walletAddress: string): Project {
  const short = `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`;
  const id = `proj_${walletAddress.slice(0, 8)}`;
  return ensureProjectKeys({
    id,
    name: `Workspace (${short})`,
    slug: `workspace-${walletAddress.slice(0, 6).toLowerCase()}`,
    environment: "sandbox",
    planIds: [], // 100% clean, no hardcoded values!
    merchantWallet: walletAddress,
  });
}

export type SettingsTab = "general" | "network" | "billing" | "appearance" | "danger";

interface ProjectContextValue {
  projects: Project[];
  activeProject: Project;
  switchProject: (projectId: string) => void;
  createProject: (name: string) => Project;
  addPlanToActiveProject: (planIdOrAddress: string) => void;
  toggleEnvironment: () => void;
  resetAllProjects: () => void;
  updateActiveProject: (updates: Partial<Project>) => void;
  deleteProject: (projectId: string) => void;
  isSettingsOpen: boolean;
  settingsInitialTab: SettingsTab;
  openSettingsModal: (tab?: SettingsTab) => void;
  closeSettingsModal: () => void;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { publicKey } = useWallet();
  const walletAddress = publicKey?.toBase58() ?? null;

  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>("");

  // Whenever wallet changes, load projects strictly belonging to this wallet
  useEffect(() => {
    if (!walletAddress) {
      setProjects([]);
      setActiveProjectId("");
      return;
    }

    const currentWalletAddress = walletAddress;
    const storageKey = `tidepay_projects_${currentWalletAddress}`;
    const activeKey = `tidepay_active_project_${currentWalletAddress}`;

    async function loadWalletProjects() {
      try {
        // 1. Fetch from Neon Postgres
        const res = await fetch(`/api/projects?wallet=${currentWalletAddress}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data) && json.data.length > 0) {
            const keyedProjects = json.data.map(ensureProjectKeys);
            setProjects(keyedProjects);
            const savedActive = localStorage.getItem(activeKey);
            if (savedActive && keyedProjects.some((p: Project) => p.id === savedActive)) {
              setActiveProjectId(savedActive);
            } else {
              setActiveProjectId(keyedProjects[0].id);
            }
            return;
          }
        }
      } catch (err) {
        console.warn("[TidePay] Failed to fetch wallet projects from Neon:", err);
      }

      // 2. Check wallet-specific localStorage
      try {
        const local = localStorage.getItem(storageKey);
        if (local) {
          const parsed = JSON.parse(local) as Project[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            const keyedProjects = parsed.map(ensureProjectKeys);
            setProjects(keyedProjects);
            const savedActive = localStorage.getItem(activeKey);
            setActiveProjectId(savedActive && keyedProjects.some((p) => p.id === savedActive) ? savedActive : keyedProjects[0].id);
            return;
          }
        }
      } catch {
        // Ignore JSON error
      }

      // 3. New wallet! Create fresh blank default workspace
      const freshProject = createDefaultProjectForWallet(currentWalletAddress);
      setProjects([freshProject]);
      setActiveProjectId(freshProject.id);

      try {
        localStorage.setItem(storageKey, JSON.stringify([freshProject]));
        localStorage.setItem(activeKey, freshProject.id);
      } catch {
        // Ignore local storage error
      }

      // Persist to Neon DB
      fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(freshProject),
      }).catch((e) => console.error("[TidePay] Failed to save initial workspace to Neon:", e));
    }

    loadWalletProjects();
  }, [walletAddress]);

  const saveProjects = useCallback(
    (newProjects: Project[], newActiveId?: string) => {
      const keyed = newProjects.map(ensureProjectKeys);
      setProjects(keyed);
      if (!walletAddress) return;

      const storageKey = `tidepay_projects_${walletAddress}`;
      const activeKey = `tidepay_active_project_${walletAddress}`;

      try {
        localStorage.setItem(storageKey, JSON.stringify(keyed));
        if (newActiveId) {
          setActiveProjectId(newActiveId);
          localStorage.setItem(activeKey, newActiveId);
        }
      } catch (e) {
        console.error("[TidePay] Failed to persist wallet projects:", e);
      }
    },
    [walletAddress]
  );

  const switchProject = useCallback(
    (projectId: string) => {
      setActiveProjectId(projectId);
      if (walletAddress) {
        try {
          localStorage.setItem(`tidepay_active_project_${walletAddress}`, projectId);
        } catch (e) {
          console.error("[TidePay] Failed to persist active project:", e);
        }
      }
    },
    [walletAddress]
  );

  const createProject = useCallback(
    (name: string): Project => {
      const trimmed = name.trim();
      const slug = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 24);
      const newProj: Project = ensureProjectKeys({
        id: `proj_${Date.now()}`,
        name: trimmed,
        slug,
        environment: "sandbox",
        planIds: [], // 100% clean!
        merchantWallet: walletAddress || undefined,
        secretKey: `tp_dev_sec_${generateRandomHex(24)}`,
        publishableKey: `tp_dev_pub_${generateRandomHex(24)}`,
        signingSecret: `whsec_${generateRandomHex(20)}`,
        webhookUrl: "https://api.yourdomain.com/webhooks/tidepay",
      });
      const updated = [...projects, newProj];
      saveProjects(updated, newProj.id);

      // Persist to Neon DB
      fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProj),
      }).catch((e) => console.error("[TidePay] Failed to sync new project to Neon DB:", e));

      return newProj;
    },
    [projects, saveProjects, walletAddress]
  );

  const addPlanToActiveProject = useCallback(
    (planIdOrAddress: string) => {
      setProjects((currentProjects) => {
        let updatedPlans: string[] = [];
        const updated = currentProjects.map((proj) => {
          if (proj.id === activeProjectId) {
            const currentPlans = proj.planIds || [];
            if (!currentPlans.includes(planIdOrAddress)) {
              updatedPlans = [...currentPlans, planIdOrAddress];
              return { ...proj, planIds: updatedPlans };
            }
            updatedPlans = currentPlans;
          }
          return proj;
        });

        if (walletAddress) {
          try {
            localStorage.setItem(`tidepay_projects_${walletAddress}`, JSON.stringify(updated));
          } catch (e) {
            console.error("[TidePay] Failed to save plan to project:", e);
          }
        }

        if (updatedPlans.length > 0 && activeProjectId) {
          fetch(`/api/projects/${activeProjectId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ planIds: updatedPlans }),
          }).catch((e) => console.error("[TidePay] Failed to sync plan to Neon DB:", e));
        }

        return updated;
      });
    },
    [activeProjectId, walletAddress]
  );

  const toggleEnvironment = useCallback(() => {
    setProjects((currentProjects) => {
      let nextEnv = "sandbox";
      let updatedProject: Project | null = null;
      const updated = currentProjects.map((p) => {
        if (p.id === activeProjectId) {
          nextEnv = p.environment === "sandbox" ? "live" : "sandbox";
          const nextPrefix = nextEnv === "live" ? "live" : "dev";
          const prevPrefix = nextEnv === "live" ? "dev" : "live";
          const secretKey = p.secretKey?.replace(`tp_${prevPrefix}_sec_`, `tp_${nextPrefix}_sec_`)
            || `tp_${nextPrefix}_sec_${stableHex(p.id + "_sec", 24)}`;
          const publishableKey = p.publishableKey?.replace(`tp_${prevPrefix}_pub_`, `tp_${nextPrefix}_pub_`)
            || `tp_${nextPrefix}_pub_${stableHex(p.id + "_pub", 24)}`;

          updatedProject = {
            ...p,
            environment: nextEnv as "sandbox" | "live",
            secretKey,
            publishableKey,
          };
          return updatedProject;
        }
        return p;
      });

      if (walletAddress) {
        try {
          localStorage.setItem(`tidepay_projects_${walletAddress}`, JSON.stringify(updated));
        } catch (e) {
          console.error("[TidePay] Failed to persist environment toggle:", e);
        }
      }

      if (activeProjectId && updatedProject) {
        fetch(`/api/projects/${activeProjectId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            environment: nextEnv,
            secretKey: (updatedProject as Project).secretKey,
            publishableKey: (updatedProject as Project).publishableKey,
          }),
        }).catch((e) => console.error("[TidePay] Failed to sync env to Neon DB:", e));
      }

      return updated;
    });
  }, [activeProjectId, walletAddress]);

  const updateActiveProject = useCallback(
    (updates: Partial<Project>) => {
      setProjects((currentProjects) => {
        const updated = currentProjects.map((p) => {
          if (p.id === activeProjectId) {
            return { ...p, ...updates };
          }
          return p;
        });

        if (walletAddress) {
          try {
            localStorage.setItem(`tidepay_projects_${walletAddress}`, JSON.stringify(updated));
          } catch (e) {
            console.error("[TidePay] Failed to persist updated project:", e);
          }
        }

        if (activeProjectId) {
          fetch(`/api/projects/${activeProjectId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updates),
          }).catch((e) => console.error("[TidePay] Failed to sync project updates to Neon DB:", e));
        }

        return updated;
      });
    },
    [activeProjectId, walletAddress]
  );

  const deleteProject = useCallback(
    (projectId: string) => {
      setProjects((currentProjects) => {
        if (currentProjects.length <= 1) return currentProjects;
        const remaining = currentProjects.filter((p) => p.id !== projectId);
        const nextActive = remaining[0]?.id || "";
        setActiveProjectId(nextActive);

        if (walletAddress) {
          try {
            localStorage.setItem(`tidepay_projects_${walletAddress}`, JSON.stringify(remaining));
            localStorage.setItem(`tidepay_active_project_${walletAddress}`, nextActive);
          } catch (e) {
            console.error("[TidePay] Failed to persist remaining projects:", e);
          }
        }

        fetch(`/api/projects/${projectId}`, {
          method: "DELETE",
        }).catch((e) => console.error("[TidePay] Failed to delete project from Neon DB:", e));

        return remaining;
      });
    },
    [walletAddress]
  );

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<SettingsTab>("general");

  const openSettingsModal = useCallback((tab?: SettingsTab) => {
    if (tab) setSettingsInitialTab(tab);
    setIsSettingsOpen(true);
  }, []);

  const closeSettingsModal = useCallback(() => {
    setIsSettingsOpen(false);
  }, []);

  const resetAllProjects = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.clear();
      window.location.reload();
    }
  }, []);

  const fallbackProject: Project = walletAddress
    ? createDefaultProjectForWallet(walletAddress)
    : {
        id: "proj_default",
        name: "My Workspace",
        slug: "my-workspace",
        environment: "sandbox",
        planIds: [],
        secretKey: "tp_dev_sec_defaultworkspacekey123",
        publishableKey: "tp_dev_pub_defaultworkspacekey123",
        signingSecret: "whsec_defaultsignsecret123",
        webhookUrl: "https://api.yourdomain.com/webhooks/tidepay",
      };

  const rawActive =
    projects.find((p) => p.id === activeProjectId) || projects[0] || fallbackProject;
  const activeProject = ensureProjectKeys(rawActive);

  return (
    <ProjectContext.Provider
      value={{
        projects,
        activeProject,
        switchProject,
        createProject,
        addPlanToActiveProject,
        toggleEnvironment,
        resetAllProjects,
        updateActiveProject,
        deleteProject,
        isSettingsOpen,
        settingsInitialTab,
        openSettingsModal,
        closeSettingsModal,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) {
    throw new Error("useProject must be used within a ProjectProvider");
  }
  return ctx;
}
