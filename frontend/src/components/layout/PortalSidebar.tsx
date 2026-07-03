"use client";

import { createContext, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  BarChart3,
  Settings,
  Shield,
  Users,
  Flag,
  BookOpen,
  Eye,
  Menu,
  X,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PortalNavItem } from "@/lib/portal-nav";

const brandIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  "/brand/dashboard": LayoutDashboard,
  "/brand/products": Package,
  "/brand/analytics": BarChart3,
  "/brand/billing": CreditCard,
  "/brand/settings": Settings,
};

const adminIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  "/admin/dashboard": LayoutDashboard,
  "/admin/brands": Users,
  "/admin/billing/plans": CreditCard,
  "/admin/billing/brands": Package,
  "/admin/products/moderation": Package,
  "/admin/flagged-links": Flag,
  "/admin/rules/styles": BookOpen,
  "/admin/rules/occasions": BookOpen,
  "/admin/analytics": BarChart3,
  "/admin/privacy": Shield,
  "/admin/try-on-monitoring": Eye,
};

interface PortalSidebarContextValue {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  toggleMobile: () => void;
}

const PortalSidebarContext = createContext<PortalSidebarContextValue | null>(null);

export function usePortalSidebar() {
  return useContext(PortalSidebarContext);
}

function PortalNavLinks({
  nav,
  pathname,
  isAdmin,
  onNavigate,
}: {
  nav: PortalNavItem[];
  pathname: string;
  isAdmin: boolean;
  onNavigate?: () => void;
}) {
  const iconMap = isAdmin ? adminIcons : brandIcons;

  return (
    <nav className="space-y-1" aria-label="Điều hướng portal">
      {nav.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = iconMap[item.href];
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {Icon && <Icon className="h-4 w-4 shrink-0" />}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function PortalMenuButton({ className }: { className?: string }) {
  const ctx = usePortalSidebar();
  if (!ctx) return null;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn("shrink-0 lg:hidden", className)}
      aria-label={ctx.mobileOpen ? "Đóng menu" : "Mở menu"}
      onClick={ctx.toggleMobile}
    >
      {ctx.mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
    </Button>
  );
}

interface PortalSidebarProviderProps {
  nav: PortalNavItem[];
  isAdmin: boolean;
  children: React.ReactNode;
}

export function PortalSidebarProvider({ nav, isAdmin, children }: PortalSidebarProviderProps) {
  const pathname = usePathname() ?? "/";
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- close drawer after route change
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <PortalSidebarContext.Provider
      value={{
        mobileOpen,
        setMobileOpen,
        toggleMobile: () => setMobileOpen((o) => !o),
      }}
    >
      {children}

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu điều hướng">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Đóng menu"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 flex h-full w-[min(18rem,85vw)] flex-col border-r border-border/60 bg-background shadow-xl">
            <div className="flex h-16 items-center justify-between border-b border-border/60 px-4">
              <span className="font-display text-sm font-semibold">Menu</span>
              <Button type="button" variant="ghost" size="icon" aria-label="Đóng menu" onClick={() => setMobileOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <PortalNavLinks
                nav={nav}
                pathname={pathname}
                isAdmin={isAdmin}
                onNavigate={() => setMobileOpen(false)}
              />
            </div>
          </aside>
        </div>
      )}
    </PortalSidebarContext.Provider>
  );
}

export function PortalSidebarAside({ nav, isAdmin }: { nav: PortalNavItem[]; isAdmin: boolean }) {
  const pathname = usePathname() ?? "/";

  return (
    <aside className="hidden w-56 shrink-0 self-stretch lg:block xl:w-60">
      <div className="sticky top-[calc(4rem+0.75rem)] rounded-2xl border border-border/60 bg-card p-3 shadow-sm">
        <PortalNavLinks nav={nav} pathname={pathname} isAdmin={isAdmin} />
      </div>
    </aside>
  );
}
