"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";

export interface Project {
  id: string;
  name: string;
  slug: string;
  environment: "sandbox" | "live";
  planIds: string[];
}

export const INITIAL_PROJECT: Project = {
  id: "proj_axiom",
  name: "Axiom Collective",
  slug: "axiom-collective",
  environment: "sandbox",
  planIds: ["google-pro", "4g6EF4q95h1pbVG3Gv7AspaZQ6PujFCYCr3eu63RdC6P"],
};

interface ProjectContextValue {
  projects: Project[];
  activeProject: Project;
  switchProject: (projectId: string) => void;
  createProject: (name: string) => Project;
  addPlanToActiveProject: (planIdOrAddress: string) => void;
  toggleEnvironment: () => void;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([INITIAL_PROJECT]);
  const [activeProjectId, setActiveProjectId] = useState<string>(INITIAL_PROJECT.id);

  // Load from Neon Postgres API on client mount (with localStorage fallback)
  useEffect(() => {
    async function loadProjects() {
      try {
        const res = await fetch("/api/projects");
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data) && json.data.length > 0) {
            setProjects(json.data);
            const savedActiveId = localStorage.getItem("tidepay_active_project_v2");
            if (savedActiveId && json.data.some((p: Project) => p.id === savedActiveId)) {
              setActiveProjectId(savedActiveId);
            } else {
              setActiveProjectId(json.data[0].id);
            }
            return;
          }
        }
      } catch (err) {
        console.warn("[TidePay] Neon DB fetch failed, falling back to local storage:", err);
      }

      // Fallback to local storage
      try {
        const savedProjects = localStorage.getItem("tidepay_projects_v2");
        const savedActiveId = localStorage.getItem("tidepay_active_project_v2");
        if (savedProjects) {
          const parsed = JSON.parse(savedProjects) as Project[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            setProjects(parsed);
            if (savedActiveId && parsed.some((p) => p.id === savedActiveId)) {
              setActiveProjectId(savedActiveId);
            } else {
              setActiveProjectId(parsed[0].id);
            }
            return;
          }
        }
      } catch (e) {
        console.error("[TidePay] Failed to load projects from storage:", e);
      }
    }

    loadProjects();
  }, []);

  const saveProjects = useCallback((newProjects: Project[], newActiveId?: string) => {
    setProjects(newProjects);
    try {
      localStorage.setItem("tidepay_projects_v2", JSON.stringify(newProjects));
      if (newActiveId) {
        setActiveProjectId(newActiveId);
        localStorage.setItem("tidepay_active_project_v2", newActiveId);
      }
    } catch (e) {
      console.error("[TidePay] Failed to persist projects:", e);
    }
  }, []);

  const switchProject = useCallback((projectId: string) => {
    setActiveProjectId(projectId);
    try {
      localStorage.setItem("tidepay_active_project_v2", projectId);
    } catch (e) {
      console.error("[TidePay] Failed to persist active project:", e);
    }
  }, []);

  const createProject = useCallback(
    (name: string): Project => {
      const trimmed = name.trim();
      const slug = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 24);
      const newProj: Project = {
        id: `proj_${Date.now()}`,
        name: trimmed,
        slug,
        environment: "sandbox",
        planIds: [], // Pristine, no hardcoded demo plans!
      };
      const updated = [...projects, newProj];
      saveProjects(updated, newProj.id);

      // Async sync to Neon DB
      fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProj),
      }).catch((e) => console.error("[TidePay] Failed to sync new project to Neon DB:", e));

      return newProj;
    },
    [projects, saveProjects]
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
        try {
          localStorage.setItem("tidepay_projects_v2", JSON.stringify(updated));
        } catch (e) {
          console.error("[TidePay] Failed to save plan to project:", e);
        }

        // Async sync to Neon DB
        if (updatedPlans.length > 0) {
          fetch(`/api/projects/${activeProjectId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ planIds: updatedPlans }),
          }).catch((e) => console.error("[TidePay] Failed to sync plan to Neon DB:", e));
        }

        return updated;
      });
    },
    [activeProjectId]
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
      try {
        localStorage.setItem("tidepay_projects_v2", JSON.stringify(updated));
      } catch (e) {
        console.error("[TidePay] Failed to persist environment toggle:", e);
      }

      // Async sync to Neon DB
      fetch(`/api/projects/${activeProjectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ environment: nextEnv }),
      }).catch((e) => console.error("[TidePay] Failed to sync env to Neon DB:", e));

      return updated;
    });
  }, [activeProjectId]);

  const activeProject =
    projects.find((p) => p.id === activeProjectId) || projects[0] || INITIAL_PROJECT;

  return (
    <ProjectContext.Provider
      value={{
        projects,
        activeProject,
        switchProject,
        createProject,
        addPlanToActiveProject,
        toggleEnvironment,
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
