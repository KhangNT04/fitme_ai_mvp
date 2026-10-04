"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Package,
  CheckCircle2,
  MousePointerClick,
  Percent,
  Shirt,
  Sparkles,
  TrendingUp,
  ShoppingBag,
  Banknote,
  Truck,
  XCircle,
} from "lucide-react";
import { brandApi } from "@/services/brand-api";
import { PortalLayout, brandNav } from "@/components/layout/PortalLayout";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { StatCard, StatCardGrid } from "@/components/common/AnalyticsChart";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { ErrorState } from "@/components/common/ErrorState";
import { Button } from "@/components/ui/button";
import { formatPercent, formatPrice } from "@/utils/format-price";

export default function BrandDashboardPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["brand-dashboard"],
    queryFn: () => brandApi.getDashboard(),
  });

  const salesQuery = useQuery({
    queryKey: ["brand-sales-summary"],
    queryFn: () => brandApi.getSalesSummary(),
  });

  return (
    <PortalLayout title="Brand" nav={brandNav}>
      <PortalPageHeader
        title="Tổng quan"
        description="Số liệu sản phẩm, lượt click mua, hiệu quả thử mặc AI và bán hàng trên marketplace FitMe."
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

      <div className="mt-8 space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground">Bán hàng (30 ngày)</h2>
            <p className="text-sm text-muted-foreground">
              Doanh thu từ đơn seller trên marketplace — hoa hồng nền tảng trừ theo chính sách đối soát.
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/brand/orders">Xem đơn hàng</Link>
          </Button>
        </div>

        {salesQuery.isLoading && <LoadingSkeleton count={2} />}
        {salesQuery.error && <ErrorState onRetry={() => salesQuery.refetch()} />}
        {salesQuery.data && (
          <StatCardGrid className="lg:grid-cols-4">
            <StatCard
              label="Đơn (30 ngày)"
              value={salesQuery.data.ordersLast30Days}
              icon={<ShoppingBag className="h-5 w-5" />}
              tone="sky"
            />
            <StatCard
              label="Doanh thu (30 ngày)"
              value={formatPrice(salesQuery.data.revenueLast30DaysVnd)}
              icon={<Banknote className="h-5 w-5" />}
              tone="emerald"
            />
            <StatCard
              label="Đã giao"
              value={salesQuery.data.deliveredCount}
              icon={<Truck className="h-5 w-5" />}
              tone="violet"
            />
            <StatCard
              label="Đã hủy"
              value={salesQuery.data.cancelledCount}
              icon={<XCircle className="h-5 w-5" />}
              tone="rose"
            />
          </StatCardGrid>
        )}
      </div>
    </PortalLayout>
  );
}
