"use client";

import { useQuery } from "@tanstack/react-query";
import { Building2, Flag, Package, Shirt, Sparkles, Users } from "lucide-react";
import { adminApi } from "@/services/admin-api";
import { PortalAdminPage } from "@/components/portal/PortalAdminPage";
import { StatCard, StatCardGrid } from "@/components/common/AnalyticsChart";

export default function AdminDashboardPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => adminApi.getDashboard(),
  });

  return (
    <PortalAdminPage
      title="Tổng quan hệ thống"
      description="Theo dõi brand, sản phẩm chờ duyệt và hoạt động AI trên nền tảng."
      isLoading={isLoading}
      error={error}
      onRetry={() => refetch()}
      skeleton="card"
    >
      {data && (
        <StatCardGrid>
          <StatCard label="Tổng brand" value={data.totalBrands} sub={`${data.pendingBrands} chờ duyệt`} icon={<Building2 className="h-5 w-5" />} tone="violet" />
          <StatCard label="Tổng sản phẩm" value={data.totalProducts} sub={`${data.pendingProducts} chờ duyệt`} icon={<Package className="h-5 w-5" />} tone="sky" />
          <StatCard label="Link lỗi" value={data.flaggedLinks} icon={<Flag className="h-5 w-5" />} tone="rose" />
          <StatCard label="Người dùng" value={data.activeUsers} icon={<Users className="h-5 w-5" />} tone="emerald" />
          <StatCard label="Tư vấn AI" value={data.totalRecommendations} icon={<Sparkles className="h-5 w-5" />} tone="indigo" />
          <StatCard label="Thử mặc AI" value={data.totalTryOns} icon={<Shirt className="h-5 w-5" />} tone="amber" />
        </StatCardGrid>
      )}
    </PortalAdminPage>
  );
}
