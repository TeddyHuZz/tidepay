"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, isActivePath } from "./nav-items";

import { DeveloperDockButton } from "./developer-dock-button";
import { ProjectSwitcher } from "./project-switcher";
import { SidebarOnboardingWidget } from "@/components/onboarding/sidebar-onboarding-widget";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="relative z-40 flex shrink-0 flex-col gap-4 border-b px-4 py-4 md:sticky md:top-0 md:h-dvh md:w-60 md:gap-5 md:border-r md:border-b-0 md:py-5">
      <Link href="/" className="rounded-md px-2 outline-none focus-visible:outline-2 focus-visible:outline-ring">
        <Logo />
      </Link>

      <div className="px-1">
        <ProjectSwitcher />
      </div>

      <nav aria-label="Main" className="-mx-1 flex gap-1 overflow-x-auto no-scrollbar scroll-smooth px-1 py-0.5 md:mx-0 md:flex-col md:gap-0.5 md:overflow-visible md:px-0 md:py-0">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActivePath(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-9 sm:h-10 md:h-11 shrink-0 items-center gap-2 sm:gap-2.5 md:gap-3 rounded-md px-2.5 sm:px-3 text-xs sm:text-sm outline-none transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                active
                  ? "bg-accent font-medium text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
              )}
            >
              <Icon className="size-4 md:size-4.5" aria-hidden="true" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Docked Panel: Onboarding Guide seated directly on top of Developer Dock */}
      <div className="mt-auto hidden md:flex md:flex-col md:gap-2">
        <SidebarOnboardingWidget />
        <DeveloperDockButton className="mt-0" />
      </div>

      {/* Mobile Floating Developer Hub */}
      <DeveloperDockButton variant="mobile" />
    </aside>
  );
}
