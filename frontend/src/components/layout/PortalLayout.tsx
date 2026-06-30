"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Sparkles,
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
  LogOut,
  Home,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { portalContentClass } from "@/lib/design-tokens";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth-store";

interface PortalNavItem {
  href: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface PortalLayoutProps {
  title: "Brand" | "Admin";
  nav: PortalNavItem[];
  children: React.ReactNode;
}

const brandIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  "/brand/dashboard": LayoutDashboard,
  "/brand/products": Package,
  "/brand/analytics": BarChart3,
  "/brand/settings": Settings,
};

const adminIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  "/admin/dashboard": LayoutDashboard,
  "/admin/brands": Users,
  "/admin/products/moderation": Package,
  "/admin/flagged-links": Flag,
  "/admin/rules/styles": BookOpen,
  "/admin/rules/occasions": BookOpen,
  "/admin/analytics": BarChart3,
  "/admin/privacy": Shield,
  "/admin/try-on-monitoring": Eye,
};

function PortalNavLinks({
  nav,
  iconMap,
  pathname,
  onNavigate,
}: {
  nav: PortalNavItem[];
  iconMap: Record<string, React.ComponentType<{ className?: string }>>;
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="space-y-1">
      {nav.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = iconMap[item.href] || item.icon;
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

export function PortalLayout({ title, nav, children }: PortalLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [mobileOpen, setMobileOpen] = useState(false);
  const iconMap = title === "Admin" ? adminIcons : brandIcons;
  const loginHref = title === "Admin" ? "/admin/login" : "/brand/login";
  const accentClass = title === "Admin" ? "from-violet-600 to-indigo-600" : "gradient-ai";

  useEffect(() => {
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

  const handleLogout = async () => {
    await logout();
    router.push(loginHref);
  };

  return (
    <div className="min-h-svh bg-muted/30">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 md:hidden"
              aria-label={mobileOpen ? "Đóng menu" : "Mở menu"}
              onClick={() => setMobileOpen((o) => !o)}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <Link href={nav[0]?.href ?? "/"} className="flex min-w-0 items-center gap-2 font-display font-semibold text-foreground">
              <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white", accentClass)}>
                <Sparkles className="h-3.5 w-3.5" />
              </span>
              <span className="truncate">
                FitMe AI
                <span className="hidden font-normal text-muted-foreground sm:inline"> — {title === "Admin" ? "Quản trị" : "Thương hiệu"}</span>
              </span>
            </Link>
          </div>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            {user?.email && (
              <span className="hidden max-w-[10rem] truncate text-xs text-muted-foreground lg:inline" title={user.email}>
                {user.fullName || user.email}
              </span>
            )}
            <Button variant="ghost" size="sm" className="hidden sm:inline-flex" asChild>
              <Link href="/">
                <Home className="mr-1.5 h-4 w-4" />
                Trang chủ
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="mr-1.5 h-4 w-4 sm:mr-0" />
              <span className="hidden sm:inline">Đăng xuất</span>
            </Button>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menu điều hướng">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Đóng menu"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 flex h-full w-[min(18rem,85vw)] flex-col border-r border-border/60 bg-background shadow-xl">
            <div className="flex h-14 items-center justify-between border-b border-border/60 px-4">
              <span className="font-display text-sm font-semibold">Menu</span>
              <Button type="button" variant="ghost" size="icon" aria-label="Đóng menu" onClick={() => setMobileOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <PortalNavLinks nav={nav} iconMap={iconMap} pathname={pathname} onNavigate={() => setMobileOpen(false)} />
            </div>
            <div className="border-t border-border/60 p-4">
              <Button variant="ghost" className="w-full justify-start" asChild>
                <Link href="/" onClick={() => setMobileOpen(false)}>
                  <Home className="mr-2 h-4 w-4" />
                  Về trang chủ
                </Link>
              </Button>
            </div>
          </aside>
        </div>
      )}

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-5 sm:gap-8 sm:px-6 sm:py-8">
        <aside className="hidden w-56 shrink-0 lg:block xl:w-60">
          <div className="sticky top-[4.5rem] rounded-2xl border border-border/60 bg-card p-3 shadow-sm">
            <PortalNavLinks nav={nav} iconMap={iconMap} pathname={pathname} />
          </div>
        </aside>
        <main className={portalContentClass}>{children}</main>
      </div>
    </div>
  );
}

export const brandNav: PortalNavItem[] = [
  { href: "/brand/dashboard", label: "Tổng quan" },
  { href: "/brand/products", label: "Sản phẩm" },
  { href: "/brand/analytics", label: "Phân tích" },
  { href: "/brand/settings", label: "Cài đặt" },
];

export const adminNav: PortalNavItem[] = [
  { href: "/admin/dashboard", label: "Tổng quan" },
  { href: "/admin/brands", label: "Thương hiệu" },
  { href: "/admin/products/moderation", label: "Duyệt sản phẩm" },
  { href: "/admin/flagged-links", label: "Link bị gắn cờ" },
  { href: "/admin/rules/styles", label: "Quy tắc phong cách" },
  { href: "/admin/rules/occasions", label: "Quy tắc dịp" },
  { href: "/admin/analytics", label: "Phân tích" },
  { href: "/admin/privacy", label: "Quyền riêng tư" },
  { href: "/admin/try-on-monitoring", label: "Giám sát thử mặc" },
];
