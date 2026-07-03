"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { billingApi } from "@/services/billing-api";

export function useBrandDashboardGate() {
  const router = useRouter();
  const { data, isLoading, error } = useQuery({
    queryKey: ["brand-billing-summary"],
    queryFn: () => billingApi.getSummary(),
    retry: false,
  });

  useEffect(() => {
    if (!isLoading && data && !data.dashboardEnabled) {
      router.replace("/brand/billing");
    }
  }, [data, isLoading, router]);

  return { data, isLoading, error, dashboardEnabled: data?.dashboardEnabled ?? false };
}
