"use client";

import { useQuery } from "@tanstack/react-query";
import { brandApi } from "@/services/brand-api";
import { PortalBrandPage } from "@/components/portal/PortalBrandPage";
import { AnalyticsChart } from "@/components/common/AnalyticsChart";

export default function BrandAnalyticsRedirectPage() {
  const { data } = useQuery({
    queryKey: ["brand-analytics-redirect"],
    queryFn: () => brandApi.getAnalyticsRedirect(),
  });

  return (
    <PortalBrandPage
      title="Phân tích chuyển hướng mua"
      description="Cột xanh: số lượt click — đường cam: tỷ trọng % trên tổng."
      backHref="/brand/analytics"
      backLabel="Phân tích"
    >
      <AnalyticsChart
        title="Click mua theo kênh"
        description="Shopee, website và các kênh chuyển hướng khác"
        data={data?.redirectClicks || []}
        barLabel="Lượt click"
        lineLabel="% tổng"
      />
    </PortalBrandPage>
  );
}
