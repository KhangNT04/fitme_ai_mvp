"use client";

import { useQuery } from "@tanstack/react-query";
import { brandApi } from "@/services/brand-api";
import { PortalLayout, brandNav } from "@/components/layout/PortalLayout";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { AnalyticsChart } from "@/components/common/AnalyticsChart";

export default function BrandAnalyticsDropoffPage() {
  const { data } = useQuery({
    queryKey: ["brand-analytics-dropoff"],
    queryFn: () => brandApi.getAnalyticsDropoff(),
  });

  return (
    <PortalLayout title="Brand" nav={brandNav}>
      <PortalPageHeader
        title="Phân tích điểm rời bỏ"
        description="Các bước trong luồng mà người dùng thường bỏ cuộc."
      />
      <AnalyticsChart
        title="Điểm rời bỏ trong luồng"
        description="Càng cao càng cần tối ưu UX tại bước đó"
        data={data?.dropoffPoints || []}
        barLabel="Lượt rời"
        lineLabel="% tổng"
        layout="horizontal"
      />
    </PortalLayout>
  );
}
