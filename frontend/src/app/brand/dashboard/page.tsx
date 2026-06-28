"use client";

import { useQuery } from "@tanstack/react-query";
import { brandApi } from "@/services/brand-api";
import { PortalLayout, brandNav } from "@/components/layout/PortalLayout";
import { StatCard } from "@/components/common/AnalyticsChart";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { ErrorState } from "@/components/common/ErrorState";
import { formatPercent } from "@/utils/format-price";

export default function BrandDashboardPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["brand-dashboard"],
    queryFn: () => brandApi.getDashboard(),
  });

  return (
    <PortalLayout title="Brand" nav={brandNav}>
      <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">Tổng quan</h1>
      {isLoading && <div className="mt-8"><LoadingSkeleton count={4} /></div>}
      {error && <div className="mt-8"><ErrorState onRetry={() => refetch()} /></div>}
      {data && (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Tổng sản phẩm" value={data.totalProducts} />
          <StatCard label="Đang hoạt động" value={data.activeProducts} />
          <StatCard label="Lượt click mua" value={data.buyClicks} />
          <StatCard label="CTR" value={formatPercent(data.clickThroughRate)} />
          <StatCard label="Lượt thử AI" value={data.tryOnAttempts} />
          <StatCard label="Try-on → Mua" value={formatPercent(data.tryOnToBuyRate)} />
          <StatCard label="AI gợi ý" value={data.aiRecommendedProducts} />
        </div>
      )}
    </PortalLayout>
  );
}
