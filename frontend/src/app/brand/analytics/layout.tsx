"use client";

import { useBrandDashboardGate } from "@/hooks/use-brand-dashboard-gate";
import { PortalLayout, brandNav } from "@/components/layout/PortalLayout";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";

export default function BrandAnalyticsLayout({ children }: { children: React.ReactNode }) {
  const gate = useBrandDashboardGate();

  if (gate.isLoading || !gate.dashboardEnabled) {
    return (
      <PortalLayout title="Brand" nav={brandNav}>
        <LoadingSkeleton count={3} />
      </PortalLayout>
    );
  }

  return children;
}
