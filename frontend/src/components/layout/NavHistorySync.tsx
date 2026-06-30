"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { normalizeNavHref, recordNavVisit, notifyNavHistoryChange, isTryOnRouteHref } from "@/lib/nav-history";
import { setConsumerNavContext } from "@/lib/nav-context";

function syncConsumerContext(pathname: string): void {
  if (pathname === "/discover" || pathname.startsWith("/discover/")) {
    setConsumerNavContext("discover");
    return;
  }
  if (isTryOnRouteHref(pathname)) {
    setConsumerNavContext("tryon");
  }
}

/** Tracks consumer route changes for dynamic back links and nav context. */
export function NavHistorySync() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();

  useEffect(() => {
    const fullPath = normalizeNavHref(pathname, search);
    recordNavVisit(fullPath);
    syncConsumerContext(pathname);
    notifyNavHistoryChange();
  }, [pathname, search]);

  return null;
}
