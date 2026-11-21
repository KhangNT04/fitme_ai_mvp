"use client";

import { useQuery } from "@tanstack/react-query";
import { brandApi } from "@/services/brand-api";
import { PortalBrandPage } from "@/components/portal/PortalBrandPage";
import { AnalyticsChart } from "@/components/common/AnalyticsChart";

export default function BrandAnalyticsHesitationPage() {
  const { data } = useQuery({
    queryKey: ["brand-analytics-hesitation"],
    queryFn: () => brandApi.getAnalyticsHesitation(),
  });

  return (
    <PortalBrandPage
      title="Phân tích do dự"
      description="Sản phẩm xem nhiều nhưng ít chuyển đổi."
      backHref="/brand/analytics"
      backLabel="Phân tích"
    >
      <AnalyticsChart
        title="Sản phẩm gây do dự"
        description="Xếp hạng theo mức độ do dự của người mua"
        data={data?.hesitationItems || []}
        barLabel="Lượt do dự"
        lineLabel="% tổng"
        layout="horizontal"
      />
    </PortalBrandPage>
  );
}
