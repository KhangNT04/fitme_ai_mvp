"use client";

import { useQuery } from "@tanstack/react-query";
import { brandApi } from "@/services/brand-api";
import { PortalLayout, brandNav } from "@/components/layout/PortalLayout";
import { AnalyticsChart } from "@/components/common/AnalyticsChart";

export default function BrandAnalyticsRedirectPage() {
  const { data } = useQuery({
    queryKey: ["brand-analytics-redirect"],
    queryFn: () => brandApi.getAnalyticsRedirect(),
  });

  return (
    <PortalLayout title="Brand" nav={brandNav}>
      <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">Phân tích chuyển hướng mua</h1>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <AnalyticsChart title="Click theo kênh" data={data?.redirectClicks || []} />
        <AnalyticsChart title="Theo thời gian" data={data?.redirectClicks || []} type="line" />
      </div>
    </PortalLayout>
  );
}
