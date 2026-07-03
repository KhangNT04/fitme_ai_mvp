"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Sparkles, Search, Bookmark, Home, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavScrollLink } from "@/components/layout/NavScrollLink";
import { PortalMenuButton } from "@/components/layout/PortalSidebar";
import { openDiscoverSearch } from "@/lib/discover-search";
import { normalizeNavPath } from "@/lib/scroll-to-top";
import {
  getPortalHomeHref,
  getPortalLoginHref,
  isPortalAppRoute,
} from "@/lib/portal-nav";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";
import { consumerShellMaxWidthClass, portalShellMaxWidthClass } from "@/lib/design-tokens";
import { isCompactHeader } from "@/lib/mobile-chrome";

const navLinks = [
  { href: "/discover", label: "Khám phá" },
  { href: "/try-on", label: "Thử mặc AI" },
  { href: "/wardrobe", label: "Tủ đồ" },
  { href: "/saved-outfits", label: "Đã lưu" },
];

const navIconButtonClass =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";

const navPillClass =
  "shrink-0 rounded-full px-3 py-2 text-sm font-medium transition-all duration-300 sm:px-4";

function NavQuickSaved({ className }: { className?: string }) {
  const pathname = usePathname() ?? "/";
  const active =
    pathname === "/saved-outfits" || pathname.startsWith("/saved-outfits/");

  return (
    <NavScrollLink
      href="/saved-outfits"
      className={cn(
        navIconButtonClass,
        active && "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary",
        className,
      )}
      aria-label="Đã lưu"
      title="Đã lưu"
    >
      <Bookmark className="h-[18px] w-[18px]" aria-hidden="true" />
    </NavScrollLink>
  );
}

function NavQuickSearch({ className }: { className?: string }) {
  const pathname = usePathname() ?? "/";

  return (
    <Link
      href="/discover#discover-search"
      onClick={(e) => {
        if (normalizeNavPath(pathname) === "/discover") {
          e.preventDefault();
          openDiscoverSearch("auto");
        }
      }}
      className={cn(navIconButtonClass, className)}
      aria-label="Tìm kiếm nhanh"
      title="Tìm kiếm nhanh"
    >
      <Search className="h-[18px] w-[18px]" aria-hidden="true" />
    </Link>
  );
}

function PortalHeader() {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);
  const portalHome = getPortalHomeHref(pathname);
  const loginHref = getPortalLoginHref(pathname);
  const isAdmin = pathname.startsWith("/admin");

  const handleLogout = async () => {
    await logout();
    router.push(loginHref);
  };

  return (
    <header className="glass-nav sticky top-0 z-40 bg-white">
      <div className={cn("mx-auto flex h-16 w-full items-center gap-2 px-4 sm:gap-3 sm:px-6", portalShellMaxWidthClass)}>
        <PortalMenuButton />
        <NavScrollLink
          href={portalHome}
          className="group flex min-w-0 flex-1 items-center gap-2 font-display font-bold text-foreground sm:flex-none sm:gap-2.5"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl gradient-ai text-white shadow-md transition-transform duration-300 group-hover:scale-105">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="truncate tracking-tight sm:inline">
            FitMe AI
            <span className="hidden font-normal text-muted-foreground sm:inline">
              {" "}
              — {isAdmin ? "Quản trị" : "Thương hiệu"}
            </span>
          </span>
        </NavScrollLink>

        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
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
  );
}

export function Header() {
  const pathname = usePathname() ?? "/";
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const isAuthed = !!accessToken;
  const compactMobile = isCompactHeader(pathname);

  if (isPortalAppRoute(pathname)) {
    return <PortalHeader />;
  }

  return (
    <header className="glass-nav sticky top-0 z-40 bg-white">
      <div className={cn("mx-auto flex h-16 w-full items-center justify-between px-4 sm:px-6", consumerShellMaxWidthClass)}>
        <NavScrollLink href="/" className="group flex items-center gap-2.5 font-display font-bold text-foreground">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl gradient-ai text-white shadow-md transition-transform duration-300 group-hover:scale-105">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="tracking-tight">FitMe AI</span>
        </NavScrollLink>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <NavScrollLink
                key={link.href}
                href={link.href}
                className={cn(
                  navPillClass,
                  active
                    ? "bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {link.label}
              </NavScrollLink>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <NavQuickSearch />
          {isAuthed ? (
            <Button variant="outline" size="sm" asChild>
              <NavScrollLink href="/profile">{user?.fullName || "Hồ sơ"}</NavScrollLink>
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/auth/login">Đăng nhập</Link>
              </Button>
              <Button variant="ai" size="sm" asChild>
                <NavScrollLink href="/ai/start">Tư vấn AI</NavScrollLink>
              </Button>
            </>
          )}
        </div>

        {compactMobile ? (
          <div className="flex items-center gap-0.5 md:hidden">
            <NavQuickSaved />
            <NavQuickSearch />
          </div>
        ) : (
          <div className="w-9 md:hidden" aria-hidden="true" />
        )}
      </div>
    </header>
  );
}
