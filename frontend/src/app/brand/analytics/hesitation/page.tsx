"use client";

import { useQuery } from "@tanstack/react-query";
import { brandApi } from "@/services/brand-api";
import { PortalLayout, brandNav } from "@/components/layout/PortalLayout";
import { AnalyticsChart } from "@/components/common/AnalyticsChart";

export default function BrandAnalyticsHesitationPage() {
  const { data } = useQuery({
    queryKey: ["brand-analytics-hesitation"],
    queryFn: () => brandApi.getAnalyticsHesitation(),
  });

  return (
    <PortalLayout title="Brand" nav={brandNav}>
      <h1 className="text-2xl font-bold">Phân tích do dự</h1>
      <div className="mt-8">
        <AnalyticsChart title="Sản phẩm gây do dự" data={data?.hesitationItems || []} type="bar" />
      </div>
    </PortalLayout>
  );
}
