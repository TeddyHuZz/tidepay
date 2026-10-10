"use client";

import { useTheme } from "@/components/theme-provider";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  iconClassName?: string;
}

export function ThemeToggle({ className, iconClassName }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      aria-label="Toggle theme"
      className={cn(
        "flex size-9 items-center justify-center rounded-lg border border-border/80 text-muted-foreground hover:bg-accent/60 hover:text-foreground transition-colors cursor-pointer",
        className
      )}
    >
      {theme === "dark" ? (
        <Sun className={cn("size-4", iconClassName)} />
      ) : (
        <Moon className={cn("size-4", iconClassName)} />
      )}
    </button>
  );
}
