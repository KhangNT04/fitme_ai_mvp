"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { brandApi } from "@/services/brand-api";
import { PortalBrandPage } from "@/components/portal/PortalBrandPage";
import { AnalyticsChart } from "@/components/common/AnalyticsChart";

export default function BrandProductAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["brand-product-analytics", id],
    queryFn: () => brandApi.getProductAnalytics(id),
  });

  return (
    <PortalBrandPage
      title="Phân tích sản phẩm"
      description="Combo cột + đường cho số liệu; donut cho phân bổ."
      backHref="/brand/products"
      backLabel="Sản phẩm"
      isLoading={isLoading}
      error={error}
      onRetry={() => refetch()}
      skeleton="card"
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <AnalyticsChart
          title="Lượt click mua"
          data={data?.redirectClicks || []}
          barLabel="Lượt click"
          lineLabel="% tổng"
        />
        <AnalyticsChart title="Hoàn cảnh phổ biến" data={data?.topOccasions || []} type="pie" />
        <AnalyticsChart
          title="Size được chọn"
          data={data?.topSizes || []}
          barLabel="Lượt chọn"
          lineLabel="% tổng"
        />
        <AnalyticsChart title="Màu được thử" data={data?.topColors || []} type="pie" />
      </div>
    </PortalBrandPage>
  );
}
