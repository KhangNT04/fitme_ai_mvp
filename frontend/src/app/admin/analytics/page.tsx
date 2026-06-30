"use client";

import { useQuery } from "@tanstack/react-query";
import { Building2, Flag, Package, Shirt, Sparkles, Users } from "lucide-react";
import { adminApi } from "@/services/admin-api";
import { PortalLayout, adminNav } from "@/components/layout/PortalLayout";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { StatCard, StatCardGrid } from "@/components/common/AnalyticsChart";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";

export default function AdminAnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => adminApi.getDashboard(),
  });

  return (
    <PortalLayout title="Admin" nav={adminNav}>
      <PortalPageHeader
        title="Phân tích toàn hệ thống"
        description="Tổng hợp hoạt động AI, người dùng và hàng đợi kiểm duyệt."
      />
      {isLoading ? (
        <LoadingSkeleton count={4} />
      ) : (
        data && (
          <StatCardGrid className="lg:grid-cols-3">
            <StatCard label="Tổng tư vấn AI" value={data.totalRecommendations} icon={<Sparkles className="h-5 w-5" />} tone="violet" />
            <StatCard label="Tổng thử mặc" value={data.totalTryOns} icon={<Shirt className="h-5 w-5" />} tone="indigo" />
            <StatCard label="Người dùng hoạt động" value={data.activeUsers} icon={<Users className="h-5 w-5" />} tone="emerald" />
            <StatCard label="Brand đang chờ" value={data.pendingBrands} icon={<Building2 className="h-5 w-5" />} tone="amber" />
            <StatCard label="Sản phẩm chờ duyệt" value={data.pendingProducts} icon={<Package className="h-5 w-5" />} tone="sky" />
            <StatCard label="Link lỗi" value={data.flaggedLinks} icon={<Flag className="h-5 w-5" />} tone="rose" />
          </StatCardGrid>
        )
      )}
    </PortalLayout>
  );
}
