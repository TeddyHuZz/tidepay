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
}

export function createDefaultProjectForWallet(walletAddress: string): Project {
  const short = `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`;
  return {
    id: `proj_${walletAddress.slice(0, 8)}`,
    name: `Workspace (${short})`,
    slug: `workspace-${walletAddress.slice(0, 6).toLowerCase()}`,
    environment: "sandbox",
    planIds: [], // 100% clean, no hardcoded values!
    merchantWallet: walletAddress,
  };
}

interface ProjectContextValue {
  projects: Project[];
  activeProject: Project;
  switchProject: (projectId: string) => void;
  createProject: (name: string) => Project;
  addPlanToActiveProject: (planIdOrAddress: string) => void;
  toggleEnvironment: () => void;
  resetAllProjects: () => void;
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
            setProjects(json.data);
            const savedActive = localStorage.getItem(activeKey);
            if (savedActive && json.data.some((p: Project) => p.id === savedActive)) {
              setActiveProjectId(savedActive);
            } else {
              setActiveProjectId(json.data[0].id);
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
            setProjects(parsed);
            const savedActive = localStorage.getItem(activeKey);
            setActiveProjectId(savedActive && parsed.some((p) => p.id === savedActive) ? savedActive : parsed[0].id);
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
      setProjects(newProjects);
      if (!walletAddress) return;

      const storageKey = `tidepay_projects_${walletAddress}`;
      const activeKey = `tidepay_active_project_${walletAddress}`;

      try {
        localStorage.setItem(storageKey, JSON.stringify(newProjects));
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
      const newProj: Project = {
        id: `proj_${Date.now()}`,
        name: trimmed,
        slug,
        environment: "sandbox",
        planIds: [], // 100% clean!
        merchantWallet: walletAddress || undefined,
      };
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
      const updated = currentProjects.map((p) => {
        if (p.id === activeProjectId) {
          nextEnv = p.environment === "sandbox" ? "live" : "sandbox";
          return { ...p, environment: nextEnv as "sandbox" | "live" };
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

      if (activeProjectId) {
        fetch(`/api/projects/${activeProjectId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ environment: nextEnv }),
        }).catch((e) => console.error("[TidePay] Failed to sync env to Neon DB:", e));
      }

      return updated;
    });
  }, [activeProjectId, walletAddress]);

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
      };

  const activeProject =
    projects.find((p) => p.id === activeProjectId) || projects[0] || fallbackProject;

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
