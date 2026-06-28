"use client";

import { useQuery } from "@tanstack/react-query";
import { brandApi } from "@/services/brand-api";
import { PortalLayout, brandNav } from "@/components/layout/PortalLayout";
import { AnalyticsChart } from "@/components/common/AnalyticsChart";

export default function BrandAnalyticsDropoffPage() {
  const { data } = useQuery({
    queryKey: ["brand-analytics-dropoff"],
    queryFn: () => brandApi.getAnalyticsDropoff(),
  });

  return (
    <PortalLayout title="Brand" nav={brandNav}>
      <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">Phân tích điểm rời bỏ</h1>
      <div className="mt-8">
        <AnalyticsChart title="Điểm rời bỏ trong luồng" data={data?.dropoffPoints || []} />
      </div>
    </PortalLayout>
  );
}
