"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { NavHistorySync } from "@/components/layout/NavHistorySync";
import { PortalSidebarProvider } from "@/components/layout/PortalSidebar";
import { getPortalNav, isPortalAppRoute, isPortalRoute } from "@/lib/portal-nav";
import { shouldShowBottomNav } from "@/lib/mobile-chrome";
import { cn } from "@/lib/utils";

interface ConsumerChromeProps {
  children: React.ReactNode;
}

function ConsumerChromeInner({ children }: ConsumerChromeProps) {
  const pathname = usePathname() ?? "/";
  const showBottomNav = shouldShowBottomNav(pathname);
  const isPortal = isPortalRoute(pathname);
  const isPortalApp = isPortalAppRoute(pathname);
  const isAuthRoute = pathname.startsWith("/auth");
  const portalNav = getPortalNav(pathname);

  const shell = (
    <div className="relative z-10 flex min-h-svh flex-col">
      <Suspense fallback={null}>
        <NavHistorySync />
      </Suspense>
      <Header />
      <main className={cn("flex min-h-0 flex-1 flex-col overflow-visible", showBottomNav && "pb-mobile-nav md:pb-0")}>{children}</main>
      {!isPortal && !isAuthRoute && <Footer />}
      <Suspense fallback={null}>
        <MobileBottomNav />
      </Suspense>
    </div>
  );

  if (isPortalApp && portalNav) {
    return (
      <PortalSidebarProvider nav={portalNav} isAdmin={pathname.startsWith("/admin")}>
        {shell}
      </PortalSidebarProvider>
    );
  }

  return shell;
}

export function ConsumerChrome({ children }: ConsumerChromeProps) {
  return <ConsumerChromeInner>{children}</ConsumerChromeInner>;
}
