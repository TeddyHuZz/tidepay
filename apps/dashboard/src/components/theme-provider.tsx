"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Theme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyThemeToDom(t: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const body = document.body;

  if (t === "light") {
    root.classList.remove("dark");
    root.classList.add("light");
    root.setAttribute("data-theme", "light");
    root.style.colorScheme = "light";
    if (body) {
      body.classList.remove("dark");
      body.classList.add("light");
      body.setAttribute("data-theme", "light");
    }
  } else {
    root.classList.remove("light");
    root.classList.add("dark");
    root.setAttribute("data-theme", "dark");
    root.style.colorScheme = "dark";
    if (body) {
      body.classList.remove("light");
      body.classList.add("dark");
      body.setAttribute("data-theme", "dark");
    }
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("tidepay_theme") as Theme | null;
      if (stored === "light" || stored === "dark") {
        setThemeState(stored);
        applyThemeToDom(stored);
      } else {
        applyThemeToDom("dark");
      }
    } catch {
      applyThemeToDom("dark");
    }
  }, []);

  const setTheme = (next: Theme) => {
    setThemeState(next);
    applyThemeToDom(next);
    try {
      localStorage.setItem("tidepay_theme", next);
    } catch {
      // Ignore local storage error
    }
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      theme: "dark",
      setTheme: () => {},
      toggleTheme: () => {},
    };
  }
  return ctx;
}
