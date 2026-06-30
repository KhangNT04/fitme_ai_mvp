"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { useConsumerStoresReady } from "@/hooks/use-consumer-stores-ready";

const DASHBOARD: Record<"brand" | "admin", string> = {
  brand: "/brand/dashboard",
  admin: "/admin/dashboard",
};

/** Skip portal login when a valid brand/admin session already exists. */
export function usePortalSessionRedirect(portal: "brand" | "admin") {
  const router = useRouter();
  const ready = useConsumerStoresReady();

  useEffect(() => {
    if (!ready) return;
    const { isAuthenticated, isBrand, isAdmin } = useAuthStore.getState();
    if (!isAuthenticated()) return;
    if (portal === "brand" && isBrand()) {
      router.replace(DASHBOARD.brand);
    }
    if (portal === "admin" && isAdmin()) {
      router.replace(DASHBOARD.admin);
    }
  }, [ready, portal, router]);
}
