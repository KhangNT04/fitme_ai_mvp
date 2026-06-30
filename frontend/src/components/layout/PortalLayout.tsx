"use client";

import { usePathname } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { PortalSidebarAside } from "@/components/layout/PortalSidebar";
import { portalContentClass, portalLayoutRowClass } from "@/lib/design-tokens";
import type { PortalNavItem } from "@/lib/portal-nav";
import { adminNav, brandNav } from "@/lib/portal-nav";

interface PortalLayoutProps {
  title?: "Brand" | "Admin";
  nav?: PortalNavItem[];
  children: React.ReactNode;
}

export function PortalLayout({ title, nav, children }: PortalLayoutProps) {
  const pathname = usePathname() ?? "/";
  const isAdmin = title === "Admin" || pathname.startsWith("/admin");
  const navItems = nav ?? (isAdmin ? adminNav : brandNav);

  return (
    <PageShell width="portal">
      <div className={portalLayoutRowClass}>
        <PortalSidebarAside nav={navItems} isAdmin={isAdmin} />
        <div className={portalContentClass}>{children}</div>
      </div>
    </PageShell>
  );
}

export { brandNav, adminNav };
export type { PortalNavItem };
