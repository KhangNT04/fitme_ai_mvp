"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { billingApi } from "@/services/billing-api";
import { getBrandDashboardBlockReason } from "@/lib/brand-dashboard-access";

export function useBrandDashboardGate() {
  const query = useQuery({
    queryKey: ["brand-billing-summary"],
    queryFn: () => billingApi.getSummary(),
    retry: false,
  });

  const blockReason = useMemo(
    () => (query.data ? getBrandDashboardBlockReason(query.data) : null),
    [query.data],
  );

  return {
    ...query,
    dashboardEnabled: query.data?.dashboardEnabled ?? false,
    blockReason,
  };
}
