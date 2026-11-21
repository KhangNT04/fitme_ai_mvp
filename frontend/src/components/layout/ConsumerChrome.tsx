"use client";

import { Suspense, useEffect, useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { NavHistorySync } from "@/components/layout/NavHistorySync";
import { PageShell } from "@/components/layout/PageShell";
import { PortalSidebarAside, PortalSidebarProvider } from "@/components/layout/PortalSidebar";
import { useSessionExpiryGuard } from "@/hooks/use-session-expiry-guard";
import { portalContentClass, portalLayoutRowClass } from "@/lib/design-tokens";
import { getPortalNav, isPortalAppRoute, isPortalRoute } from "@/lib/portal-nav";
import { getPortalWindowScroll, setPortalWindowScroll } from "@/lib/portal-scroll";
import { shouldShowBottomNav, showMobileFooter } from "@/lib/mobile-chrome";
import { cn } from "@/lib/utils";

interface ConsumerChromeProps {
  children: React.ReactNode;
}

/** Keep window scroll across portal soft navigations; F5 still starts at top. */
function usePreservePortalWindowScroll(enabled: boolean, pathname: string) {
  useEffect(() => {
    if (!enabled) return;
    const save = () => setPortalWindowScroll(window.scrollY);
    save();
    window.addEventListener("scroll", save, { passive: true });
    return () => window.removeEventListener("scroll", save);
  }, [enabled]);

  useLayoutEffect(() => {
    if (!enabled) return;
    const y = getPortalWindowScroll();
    if (y > 0 && Math.abs(window.scrollY - y) > 1) {
      window.scrollTo(0, y);
    }
  }, [enabled, pathname]);
}

function ConsumerChromeInner({ children }: ConsumerChromeProps) {
  const pathname = usePathname() ?? "/";
  // Signs the viewer out and sends them to the sign-in page once the session can no longer be renewed.
  useSessionExpiryGuard();
  const showBottomNav = shouldShowBottomNav(pathname);
  const isPortal = isPortalRoute(pathname);
  const isPortalApp = isPortalAppRoute(pathname);
  const isAuthRoute = pathname.startsWith("/auth");
  const portalNav = getPortalNav(pathname);
  const footerOnMobile = showMobileFooter(pathname);
  const isAdminPortal = pathname.startsWith("/admin");
  usePreservePortalWindowScroll(isPortalApp, pathname);

  const mainContent =
    isPortalApp && portalNav ? (
      <PageShell width="portal">
        <div className={portalLayoutRowClass}>
          <PortalSidebarAside nav={portalNav} isAdmin={isAdminPortal} />
          <div className={portalContentClass}>{children}</div>
        </div>
      </PageShell>
    ) : (
      children
    );

  const shell = (
    <div className="relative z-10 flex min-h-svh flex-col">
      <Suspense fallback={null}>
        <NavHistorySync />
      </Suspense>
      <Header />
      <main
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-visible",
          showBottomNav && !footerOnMobile && "pb-mobile-nav md:pb-0",
        )}
      >
        {mainContent}
      </main>
      {!isPortal && !isAuthRoute && <Footer showOnMobile={footerOnMobile} />}
      <Suspense fallback={null}>
        <MobileBottomNav />
      </Suspense>
    </div>
  );

  if (isPortalApp && portalNav) {
    return (
      <PortalSidebarProvider nav={portalNav} isAdmin={isAdminPortal}>
        {shell}
      </PortalSidebarProvider>
    );
  }

  return shell;
}

export function ConsumerChrome({ children }: ConsumerChromeProps) {
  return <ConsumerChromeInner>{children}</ConsumerChromeInner>;
}
