"use client";

import { useQuery } from "@tanstack/react-query";
import { brandApi } from "@/services/brand-api";
import { PortalLayout, brandNav } from "@/components/layout/PortalLayout";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { AnalyticsChart } from "@/components/common/AnalyticsChart";

export default function BrandAnalyticsRedirectPage() {
  const { data } = useQuery({
    queryKey: ["brand-analytics-redirect"],
    queryFn: () => brandApi.getAnalyticsRedirect(),
  });

  return (
    <PortalLayout title="Brand" nav={brandNav}>
      <PortalPageHeader
        title="Phân tích chuyển hướng mua"
        description="Cột xanh: số lượt click — đường cam: tỷ trọng % trên tổng."
        backHref="/brand/analytics"
        backLabel="Phân tích"
      />
      <AnalyticsChart
        title="Click mua theo kênh"
        description="Shopee, website và các kênh chuyển hướng khác"
        data={data?.redirectClicks || []}
        barLabel="Lượt click"
        lineLabel="% tổng"
      />
    </PortalLayout>
  );
}
