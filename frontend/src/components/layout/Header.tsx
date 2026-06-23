"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shirt, Menu, X } from "lucide-react";
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

export function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, isAuthenticated } = useAuthStore();

  const isPortal = pathname.startsWith("/brand") || pathname.startsWith("/admin");

  if (isPortal) return null;

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold text-stone-900">
          <Shirt className="h-6 w-6" />
          <span>FitMe AI</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-sm font-medium transition-colors hover:text-stone-900",
                pathname === link.href ? "text-stone-900" : "text-stone-500"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {isAuthenticated() ? (
            <Button variant="outline" size="sm" asChild>
              <Link href="/profile">{user?.fullName || "Hồ sơ"}</Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/auth/login">Đăng nhập</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/ai/start">Tư vấn AI</Link>
              </Button>
            </>
          )}
        </div>

        <button
          className="md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Menu"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-stone-200 bg-white px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-stone-700"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Link href="/auth/login" className="text-sm font-medium text-stone-700">
              Đăng nhập
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
