"use client";

import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/services/admin-api";
import { PortalLayout, adminNav } from "@/components/layout/PortalLayout";
import { StatCard } from "@/components/common/AnalyticsChart";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";

export default function AdminAnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => adminApi.getDashboard(),
  });

  return (
    <PortalLayout title="Admin" nav={adminNav}>
      <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">Phân tích toàn hệ thống</h1>
      {isLoading ? <LoadingSkeleton count={4} /> : data && (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard label="Tổng tư vấn AI" value={data.totalRecommendations} />
          <StatCard label="Tổng thử mặc" value={data.totalTryOns} />
          <StatCard label="Người dùng hoạt động" value={data.activeUsers} />
          <StatCard label="Brand đang chờ" value={data.pendingBrands} />
          <StatCard label="Sản phẩm chờ duyệt" value={data.pendingProducts} />
          <StatCard label="Link lỗi" value={data.flaggedLinks} />
        </div>
      )}
    </PortalLayout>
  );
}
