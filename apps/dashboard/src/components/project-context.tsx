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

  // Load from localStorage on client mount
  useEffect(() => {
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
      // If no v2 storage exists, initialize with Axiom Collective
      localStorage.setItem("tidepay_projects_v2", JSON.stringify([INITIAL_PROJECT]));
      localStorage.setItem("tidepay_active_project_v2", INITIAL_PROJECT.id);
    } catch (e) {
      console.error("[TidePay] Failed to load projects from storage:", e);
    }
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
      return newProj;
    },
    [projects, saveProjects]
  );

  const addPlanToActiveProject = useCallback(
    (planIdOrAddress: string) => {
      setProjects((currentProjects) => {
        const updated = currentProjects.map((proj) => {
          if (proj.id === activeProjectId) {
            const currentPlans = proj.planIds || [];
            if (!currentPlans.includes(planIdOrAddress)) {
              return { ...proj, planIds: [...currentPlans, planIdOrAddress] };
            }
          }
          return proj;
        });
        try {
          localStorage.setItem("tidepay_projects_v2", JSON.stringify(updated));
        } catch (e) {
          console.error("[TidePay] Failed to save plan to project:", e);
        }
        return updated;
      });
    },
    [activeProjectId]
  );

  const toggleEnvironment = useCallback(() => {
    setProjects((currentProjects) => {
      const updated = currentProjects.map((p) => {
        if (p.id === activeProjectId) {
          const nextEnv = p.environment === "sandbox" ? "live" : "sandbox";
          return { ...p, environment: nextEnv as "sandbox" | "live" };
        }
        return p;
      });
      try {
        localStorage.setItem("tidepay_projects_v2", JSON.stringify(updated));
      } catch (e) {
        console.error("[TidePay] Failed to persist environment toggle:", e);
      }
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
