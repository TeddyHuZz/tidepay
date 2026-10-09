"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, isActivePath } from "./nav-items";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex shrink-0 flex-col gap-4 border-b px-4 py-4 md:sticky md:top-0 md:h-dvh md:w-60 md:gap-7 md:border-r md:border-b-0 md:py-5">
      <Link href="/" className="rounded-md px-2 outline-none focus-visible:outline-2 focus-visible:outline-ring">
        <Logo />
      </Link>

      <nav aria-label="Main" className="-mx-1 flex gap-1 overflow-x-auto px-1 md:mx-0 md:flex-col md:gap-0.5 md:overflow-visible md:px-0">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActivePath(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-11 shrink-0 items-center gap-3 rounded-md px-3 text-sm outline-none transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                active
                  ? "bg-accent font-medium text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
              )}
            >
              <Icon className="size-[18px]" aria-hidden="true" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto hidden flex-col gap-3 rounded-lg border p-3 md:flex">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="size-2 rounded-full bg-primary" aria-hidden="true" />
          Keeper crank online
        </div>
        <div className="font-mono text-xs text-muted-foreground">Solana Devnet</div>
      </div>
    </aside>
  );
}
