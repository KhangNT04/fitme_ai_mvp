"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface PortalNavItem {
  href: string;
  label: string;
}

interface PortalLayoutProps {
  title: string;
  nav: PortalNavItem[];
  children: React.ReactNode;
}

export function PortalLayout({ title, nav, children }: PortalLayoutProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="font-semibold text-stone-900">
            FitMe AI — {title}
          </Link>
        </div>
      </div>
      <div className="mx-auto flex max-w-7xl gap-8 px-4 py-8 sm:px-6">
        <aside className="hidden w-56 shrink-0 md:block">
          <nav className="space-y-1">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "block rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  pathname === item.href || pathname.startsWith(item.href + "/")
                    ? "bg-stone-900 text-white"
                    : "text-stone-600 hover:bg-stone-100"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="flex-1 min-w-0">{children}</main>
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
  { href: "/admin/flagged-links", label: "Link lỗi" },
  { href: "/admin/rules/styles", label: "Rule phong cách" },
  { href: "/admin/rules/occasions", label: "Rule hoàn cảnh" },
  { href: "/admin/analytics", label: "Phân tích" },
  { href: "/admin/privacy", label: "Quyền riêng tư" },
  { href: "/admin/try-on-monitoring", label: "Giám sát Try-on" },
];
