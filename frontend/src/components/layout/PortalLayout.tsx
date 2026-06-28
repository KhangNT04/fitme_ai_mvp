"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, LayoutDashboard, Package, BarChart3, Settings, Shield, Users, Flag, BookOpen, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

interface PortalNavItem {
  href: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface PortalLayoutProps {
  title: string;
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

export function PortalLayout({ title, nav, children }: PortalLayoutProps) {
  const pathname = usePathname();
  const iconMap = title === "Admin" ? adminIcons : brandIcons;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border/60 bg-background shadow-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 font-display font-semibold text-foreground">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg gradient-ai text-white">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            FitMe AI — {title}
          </Link>
        </div>
      </div>
      <div className="mx-auto flex max-w-7xl gap-8 px-4 py-8 sm:px-6">
        <aside className="hidden w-60 shrink-0 md:block">
          <nav className="space-y-1">
            {nav.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              const Icon = iconMap[item.href] || item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {Icon && <Icon className="h-4 w-4 shrink-0" />}
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
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
  { href: "/admin/products/moderation", label: "Duyệt SP" },
  { href: "/admin/flagged-links", label: "Flagged links" },
  { href: "/admin/rules/styles", label: "Style rules" },
  { href: "/admin/rules/occasions", label: "Occasion rules" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/privacy", label: "Privacy" },
  { href: "/admin/try-on-monitoring", label: "Try-on monitor" },
];
