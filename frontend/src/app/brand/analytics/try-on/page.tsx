"use client";

import { useQuery } from "@tanstack/react-query";
import { brandApi } from "@/services/brand-api";
import { PortalLayout, brandNav } from "@/components/layout/PortalLayout";
import { AnalyticsChart } from "@/components/common/AnalyticsChart";

export default function BrandAnalyticsTryOnPage() {
  const { data } = useQuery({
    queryKey: ["brand-analytics-tryon"],
    queryFn: () => brandApi.getAnalyticsTryOn(),
  });

  return (
    <PortalLayout title="Brand" nav={brandNav}>
      <h1 className="text-2xl font-bold">Phân tích thử mặc AI</h1>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <AnalyticsChart title="Lượt thử theo sản phẩm" data={data?.tryOnStats || []} />
        <AnalyticsChart title="Màu được thử nhiều" data={data?.topColors || []} type="pie" />
      </div>
    </PortalLayout>
  );
}
