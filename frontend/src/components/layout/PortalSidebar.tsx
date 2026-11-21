"use client";

import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
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
  Eye,
  Menu,
  X,
  CreditCard,
  Crown,
  Gift,
  Star,
  Receipt,
  KeyRound,
  UserCog,
  LineChart,
  PersonStanding,
  Repeat,
  ScrollText,
  Sparkles as SparklesIcon,
  Ticket,
  UserCheck,
  MessagesSquare,
  MessageCircle,
  UsersRound,
  Handshake,
  Tags,
  CalendarRange,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PortalNavGroup, PortalNavItem } from "@/lib/portal-nav";
import { adminNavGroups, brandNavGroups } from "@/lib/portal-nav";
import { getPortalSidebarScroll, setPortalSidebarScroll } from "@/lib/portal-scroll";

export const brandIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  "/brand/dashboard": LayoutDashboard,
  "/brand/products": Package,
  "/brand/inbox": MessagesSquare,
  "/brand/leads": UserCheck,
  "/brand/insights/demand": SparklesIcon,
  "/brand/analytics": BarChart3,
  "/brand/plan": Crown,
  "/brand/settings": Settings,
};

export const adminIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  "/admin/dashboard": LayoutDashboard,
  "/admin/users": UserCog,
  "/admin/audit-log": ScrollText,
  "/admin/traffic": LineChart,
  "/admin/brands": Users,
  "/admin/community": UsersRound,
  "/admin/shop-chat": MessageCircle,
  "/admin/partnerships": Handshake,
  "/admin/billing/plans": CreditCard,
  "/admin/vouchers": Ticket,
  "/admin/rewards": Gift,
  "/admin/reviews": Star,
  "/admin/products/moderation": Package,
  "/admin/flagged-links": Flag,
  "/admin/rules/styles": Tags,
  "/admin/rules/occasions": CalendarRange,
  "/admin/analytics": BarChart3,
  "/admin/retention": Repeat,
  "/admin/paying-customers": Receipt,
  "/admin/privacy": Shield,
  "/admin/try-on-monitoring": Eye,
  "/admin/tryon-avatars": PersonStanding,
  "/admin/settings": Settings,
  "/admin/account": KeyRound,
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
  groups,
  pathname,
  isAdmin,
  onNavigate,
}: {
  groups: PortalNavGroup[];
  pathname: string;
  isAdmin: boolean;
  onNavigate?: () => void;
}) {
  const iconMap = isAdmin ? adminIcons : brandIcons;

  return (
    <nav className="space-y-5" aria-label="Điều hướng portal">
      {groups.map((group) => (
        <div key={group.label} className="space-y-1">
          <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
            {group.label}
          </p>
          {group.items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = iconMap[item.href];
            return (
              <Link
                key={item.href}
                href={item.href}
                scroll={false}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-all",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {Icon && <Icon className="h-4 w-4 shrink-0" />}
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
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

export function PortalSidebarProvider({ nav: _nav, isAdmin, children }: PortalSidebarProviderProps) {
  const pathname = usePathname() ?? "/";
  const [mobileOpen, setMobileOpen] = useState(false);
  const groups = isAdmin ? adminNavGroups : brandNavGroups;

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
              <div>
                <p className="font-display text-sm font-semibold">Menu</p>
                <p className="text-[11px] text-muted-foreground">
                  {isAdmin ? "Cổng quản trị" : "Cổng thương hiệu"}
                </p>
              </div>
              <Button type="button" variant="ghost" size="icon" aria-label="Đóng menu" onClick={() => setMobileOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <PortalNavLinks
                groups={groups}
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

export function PortalSidebarAside({ nav: _nav, isAdmin }: { nav: PortalNavItem[]; isAdmin: boolean }) {
  const pathname = usePathname() ?? "/";
  const groups = isAdmin ? adminNavGroups : brandNavGroups;
  const kind = isAdmin ? "admin" : "brand";
  const scrollerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = getPortalSidebarScroll(kind);
  }, [kind, pathname]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => setPortalSidebarScroll(kind, el.scrollTop);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [kind]);

  return (
    <aside className="hidden w-56 shrink-0 self-stretch lg:block xl:w-64">
      <div
        ref={scrollerRef}
        className="sticky top-[calc(4rem+0.75rem)] max-h-[calc(100dvh-5rem)] overflow-y-auto overscroll-contain rounded-2xl border border-border/60 bg-card/95 p-3.5 shadow-sm backdrop-blur-sm [scrollbar-width:thin]"
      >
        <p className="mb-3 px-3 text-[11px] font-medium text-muted-foreground">
          {isAdmin ? "Điều hướng quản trị" : "Điều hướng brand"}
        </p>
        <PortalNavLinks groups={groups} pathname={pathname} isAdmin={isAdmin} />
      </div>
    </aside>
  );
}
