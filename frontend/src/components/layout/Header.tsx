"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, Menu, X, Search } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/discover", label: "Khám phá" },
  { href: "/try-on", label: "Thử mặc AI" },
  { href: "/wardrobe", label: "Tủ đồ" },
  { href: "/saved-outfits", label: "Đã lưu" },
];

function NavQuickSearch({ className }: { className?: string }) {
  return (
    <Link
      href="/discover#discover-search"
      className={cn(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        className
      )}
      aria-label="Tìm kiếm nhanh"
      title="Tìm kiếm nhanh"
    >
      <Search className="h-[18px] w-[18px]" aria-hidden="true" />
    </Link>
  );
}

export function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const isAuthed = !!accessToken;

  const isPortal = pathname.startsWith("/brand") || pathname.startsWith("/admin");

  if (isPortal) return null;

  return (
    <header className="glass-nav sticky top-0 z-40">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-2.5 font-display font-bold text-foreground">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-600 to-orange-700 text-white shadow-md transition-transform duration-300 group-hover:scale-105">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="tracking-tight">FitMe AI</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => {
            const active = pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition-all duration-300",
                  active
                    ? "bg-amber-100/50 text-amber-900 shadow-sm ring-1 ring-amber-300/40"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <NavQuickSearch />
          {isAuthed ? (
            <Button variant="outline" size="sm" asChild>
              <Link href="/profile">{user?.fullName || "Hồ sơ"}</Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/auth/login">Đăng nhập</Link>
              </Button>
              <Button size="sm" className="bg-amber-600 text-white hover:bg-amber-700" asChild>
                <Link href="/ai/start">Tư vấn AI</Link>
              </Button>
            </>
          )}
        </div>

        <button
          className="rounded-lg p-2 text-foreground md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Menu"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-border bg-background px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-1">
            <Link
              href="/discover#discover-search"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
              onClick={() => setMobileOpen(false)}
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              Tìm kiếm nhanh
            </Link>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Link href="/auth/login" className="rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-muted">
              Đăng nhập
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
