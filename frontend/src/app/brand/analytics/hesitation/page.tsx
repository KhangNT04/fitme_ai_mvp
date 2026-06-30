"use client";

import { useQuery } from "@tanstack/react-query";
import { brandApi } from "@/services/brand-api";
import { PortalLayout, brandNav } from "@/components/layout/PortalLayout";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { AnalyticsChart } from "@/components/common/AnalyticsChart";

export default function BrandAnalyticsHesitationPage() {
  const { data } = useQuery({
    queryKey: ["brand-analytics-hesitation"],
    queryFn: () => brandApi.getAnalyticsHesitation(),
  });

  return (
    <PortalLayout title="Brand" nav={brandNav}>
      <PortalPageHeader
        title="Phân tích do dự"
        description="Sản phẩm xem nhiều nhưng ít chuyển đổi."
      />
      <AnalyticsChart
        title="Sản phẩm gây do dự"
        description="Xếp hạng theo mức độ do dự của người mua"
        data={data?.hesitationItems || []}
        barLabel="Lượt do dự"
        lineLabel="% tổng"
        layout="horizontal"
      />
    </PortalLayout>
  );
}
