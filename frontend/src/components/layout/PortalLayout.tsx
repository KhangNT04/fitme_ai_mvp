"use client";

import { useSessionExpiryGuard } from "@/hooks/use-session-expiry-guard";
import type { PortalNavItem } from "@/lib/portal-nav";
import { adminNav, brandNav } from "@/lib/portal-nav";

interface PortalLayoutProps {
  title?: "Brand" | "Admin";
  nav?: PortalNavItem[];
  children: React.ReactNode;
}

/**
 * Portal page body only. Sidebar + PageShell live in ConsumerChrome so they
 * stay mounted across in-app portal navigations (scroll position preserved).
 */
export function PortalLayout({ children }: PortalLayoutProps) {
  // Idle / expired portal sessions must leave the feature page, not show API error states.
  useSessionExpiryGuard();
  return <>{children}</>;
}

export { brandNav, adminNav };
export type { PortalNavItem };
