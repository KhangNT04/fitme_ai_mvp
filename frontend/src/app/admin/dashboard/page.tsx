"use client";

import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/services/admin-api";
import { PortalLayout, adminNav } from "@/components/layout/PortalLayout";
import { StatCard } from "@/components/common/AnalyticsChart";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";

export default function AdminDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => adminApi.getDashboard(),
  });

  return (
    <PortalLayout title="Admin" nav={adminNav}>
      <h1 className="text-2xl font-bold">Tổng quan hệ thống</h1>
      {isLoading ? <LoadingSkeleton count={4} /> : data && (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Tổng brand" value={data.totalBrands} sub={`${data.pendingBrands} chờ duyệt`} />
          <StatCard label="Tổng sản phẩm" value={data.totalProducts} sub={`${data.pendingProducts} chờ duyệt`} />
          <StatCard label="Link lỗi" value={data.flaggedLinks} />
          <StatCard label="Người dùng" value={data.activeUsers} />
          <StatCard label="Tư vấn AI" value={data.totalRecommendations} />
          <StatCard label="Thử mặc AI" value={data.totalTryOns} />
        </div>
      )}
    </PortalLayout>
  );
}
