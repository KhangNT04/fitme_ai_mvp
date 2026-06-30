"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { NavHistorySync } from "@/components/layout/NavHistorySync";
import { shouldShowBottomNav } from "@/lib/mobile-chrome";
import { cn } from "@/lib/utils";

interface ConsumerChromeProps {
  children: React.ReactNode;
}

export function ConsumerChrome({ children }: ConsumerChromeProps) {
  const pathname = usePathname();
  const showBottomNav = shouldShowBottomNav(pathname);

  return (
    <div className="relative z-10 flex min-h-svh flex-col">
      <Suspense fallback={null}>
        <NavHistorySync />
      </Suspense>
      <Header />
      <main className={cn("flex-1 overflow-visible", showBottomNav && "pb-mobile-nav md:pb-0")}>{children}</main>
      <Footer />
      <Suspense fallback={null}>
        <MobileBottomNav />
      </Suspense>
    </div>
  );
}
