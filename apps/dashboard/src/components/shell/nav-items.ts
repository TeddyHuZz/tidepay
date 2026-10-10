import { LayoutDashboard, ListChecks, MonitorPlay, Users, Webhook, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/plans", label: "Plans", icon: ListChecks },
  { href: "/subscribers", label: "Subscribers", icon: Users },
  { href: "/webhooks", label: "Webhooks & API", icon: Webhook },
  { href: "/demo", label: "Demo app", icon: MonitorPlay },
];

export function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
