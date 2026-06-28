"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { brandApi } from "@/services/brand-api";
import { PortalLayout, brandNav } from "@/components/layout/PortalLayout";
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
      <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">Phân tích sản phẩm</h1>
      {isLoading ? <LoadingSkeleton /> : (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <AnalyticsChart title="Lượt click mua" data={data?.redirectClicks || []} />
          <AnalyticsChart title="Hoàn cảnh phổ biến" data={data?.topOccasions || []} type="pie" />
          <AnalyticsChart title="Size được chọn" data={data?.topSizes || []} />
          <AnalyticsChart title="Màu được thử" data={data?.topColors || []} type="line" />
        </div>
      )}
    </PortalLayout>
  );
}
