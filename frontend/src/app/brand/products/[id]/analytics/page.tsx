"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { brandApi } from "@/services/brand-api";
import { PortalLayout, brandNav } from "@/components/layout/PortalLayout";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { AnalyticsChart } from "@/components/common/AnalyticsChart";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";

export default function BrandProductAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data, isLoading } = useQuery({
    queryKey: ["brand-product-analytics", id],
    queryFn: () => brandApi.getProductAnalytics(id),
  });

  return (
    <PortalLayout title="Brand" nav={brandNav}>
      <PortalPageHeader
        title="Phân tích sản phẩm"
        description="Combo cột + đường cho số liệu; donut cho phân bổ."
      />
      {isLoading ? (
        <LoadingSkeleton />
      ) : (
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
      )}
    </PortalLayout>
  );
}
