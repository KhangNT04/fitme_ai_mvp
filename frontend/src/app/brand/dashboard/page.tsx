"use client";

import { useQuery } from "@tanstack/react-query";
import { Package, CheckCircle2, MousePointerClick, Percent, Shirt, Sparkles, TrendingUp } from "lucide-react";
import { brandApi } from "@/services/brand-api";
import { PortalLayout, brandNav } from "@/components/layout/PortalLayout";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { StatCard, StatCardGrid } from "@/components/common/AnalyticsChart";
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
      <PortalPageHeader
        title="Tổng quan"
        description="Số liệu sản phẩm, lượt click mua và hiệu quả thử mặc AI."
      />

      {isLoading && <LoadingSkeleton count={4} />}
      {error && <ErrorState onRetry={() => refetch()} />}
      {data && (
        <StatCardGrid className="lg:grid-cols-3 xl:grid-cols-4">
          <StatCard label="Tổng sản phẩm" value={data.totalProducts} icon={<Package className="h-5 w-5" />} tone="violet" />
          <StatCard label="Đang hoạt động" value={data.activeProducts} icon={<CheckCircle2 className="h-5 w-5" />} tone="emerald" />
          <StatCard label="Lượt click mua" value={data.buyClicks} icon={<MousePointerClick className="h-5 w-5" />} tone="sky" />
          <StatCard label="CTR" value={formatPercent(data.clickThroughRate)} icon={<Percent className="h-5 w-5" />} tone="amber" />
          <StatCard label="Lượt thử AI" value={data.tryOnAttempts} icon={<Shirt className="h-5 w-5" />} tone="indigo" />
          <StatCard label="Try-on → Mua" value={formatPercent(data.tryOnToBuyRate)} icon={<TrendingUp className="h-5 w-5" />} tone="rose" />
          <StatCard label="AI gợi ý" value={data.aiRecommendedProducts} icon={<Sparkles className="h-5 w-5" />} tone="violet" />
        </StatCardGrid>
      )}
    </PortalLayout>
  );
}
