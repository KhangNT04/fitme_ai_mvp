"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { isTrackedPath, trafficApi } from "@/services/traffic-api";

export function SiteVisitTracker() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || pathname === lastPath.current || !isTrackedPath(pathname)) return;
    lastPath.current = pathname;
    void trafficApi.recordVisit(pathname);
  }, [pathname]);

  return null;
}
