"use client";

import { useQuery } from "@tanstack/react-query";
import { brandApi } from "@/services/brand-api";
import { PortalLayout, brandNav } from "@/components/layout/PortalLayout";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { AnalyticsChart } from "@/components/common/AnalyticsChart";

export default function BrandAnalyticsTryOnPage() {
  const { data } = useQuery({
    queryKey: ["brand-analytics-tryon"],
    queryFn: () => brandApi.getAnalyticsTryOn(),
  });

  return (
    <PortalLayout title="Brand" nav={brandNav}>
      <PortalPageHeader
        title="Phân tích thử mặc AI"
        description="Biểu đồ combo cột + đường cho sản phẩm; donut cho phân bổ màu."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <AnalyticsChart
          title="Lượt thử theo sản phẩm"
          description="Sản phẩm được thử mặc nhiều nhất"
          data={data?.tryOnStats || []}
          barLabel="Lượt thử"
          lineLabel="% tổng"
          layout="horizontal"
        />
        <AnalyticsChart
          title="Màu được thử nhiều"
          description="Tỷ trọng màu sắc trong các lần thử"
          data={data?.topColors || []}
          type="pie"
        />
      </div>
    </PortalLayout>
  );
}
