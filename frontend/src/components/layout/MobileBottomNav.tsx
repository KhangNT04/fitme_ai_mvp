"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Home, Compass, Sparkles, Shirt, User } from "lucide-react";
import { NavScrollLink } from "@/components/layout/NavScrollLink";
import { cn } from "@/lib/utils";
import { getActiveMobileNavTab, shouldShowBottomNav } from "@/lib/mobile-chrome";
import { isTryOnNavContext } from "@/lib/nav-context";
import { useAuthStore } from "@/stores/auth-store";

const tabs = [
  { id: "home" as const, href: "/", label: "Trang chủ", icon: Home },
  { id: "discover" as const, href: "/discover", label: "Khám phá", icon: Compass },
  { id: "ai" as const, href: "/ai/start", label: "Tư vấn AI", icon: Sparkles, fab: true },
  { id: "tryon" as const, href: "/try-on", label: "Thử mặc", icon: Shirt },
  { id: "profile" as const, href: "/profile", label: "Hồ sơ", icon: User, loginHref: "/auth/login?redirect=%2Fprofile" },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const accessToken = useAuthStore((s) => s.accessToken);
  const isAuthed = !!accessToken;

  if (!shouldShowBottomNav(pathname)) return null;

  const preferTryOn = isTryOnNavContext(pathname, searchParams);
  const activeTab = getActiveMobileNavTab(pathname, { preferTryOn });

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border/60 bg-white shadow-[0_-4px_24px_rgba(0,0,0,0.06)] md:hidden"
      aria-label="Điều hướng chính"
    >
      <div className="mobile-bottom-nav-inner mx-auto flex max-w-lg items-end justify-around px-1 pt-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const href =
            tab.id === "profile" && !isAuthed && tab.loginHref ? tab.loginHref : tab.href;
          const Icon = tab.icon;

          if (tab.fab) {
            return (
              <NavScrollLink
                key={tab.id}
                href={tab.href}
                className="relative -top-3 flex min-h-[44px] min-w-[44px] flex-col items-center justify-end gap-0.5 pb-0.5"
                aria-current={isActive ? "page" : undefined}
              >
                <span
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-full shadow-md transition-transform",
                    isActive
                      ? "gradient-ai scale-105 text-white ring-2 ring-primary/30"
                      : "gradient-ai text-white"
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span
                  className={cn(
                    "max-w-[4.5rem] truncate text-center text-[10px] font-semibold",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {tab.label}
                </span>
              </NavScrollLink>
            );
          }

          return (
            <NavScrollLink
              key={tab.id}
              href={href}
              className={cn(
                "flex min-h-[44px] min-w-[44px] flex-1 flex-col items-center justify-center gap-0.5 py-1.5 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className={cn("h-5 w-5 shrink-0", isActive && "stroke-[2.5]")} aria-hidden="true" />
              <span className="max-w-[4.5rem] truncate text-center text-[10px] font-medium">{tab.label}</span>
            </NavScrollLink>
          );
        })}
      </div>
    </nav>
  );
}
