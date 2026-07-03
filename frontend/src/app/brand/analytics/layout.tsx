"use client";

import { useBrandDashboardGate } from "@/hooks/use-brand-dashboard-gate";
import { PortalLayout, brandNav } from "@/components/layout/PortalLayout";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { ErrorState } from "@/components/common/ErrorState";
import { BrandDashboardLockedState } from "@/components/brand/BrandDashboardLockedState";

export default function BrandAnalyticsLayout({ children }: { children: React.ReactNode }) {
  const gate = useBrandDashboardGate();

  if (gate.isLoading) {
    return (
      <PortalLayout title="Brand" nav={brandNav}>
        <PortalPageHeader title="Phân tích" />
        <LoadingSkeleton count={3} />
      </PortalLayout>
    );
  }

  if (gate.error) {
    return (
      <PortalLayout title="Brand" nav={brandNav}>
        <PortalPageHeader title="Phân tích" />
        <ErrorState onRetry={() => gate.refetch()} />
      </PortalLayout>
    );
  }

  if (gate.blockReason) {
    return (
      <PortalLayout title="Brand" nav={brandNav}>
        <PortalPageHeader title="Phân tích" />
        <BrandDashboardLockedState pageLabel="Phân tích" reason={gate.blockReason} />
      </PortalLayout>
    );
  }

  return children;
}
