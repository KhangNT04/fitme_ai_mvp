"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  Flag,
  Package,
  Shirt,
  Sparkles,
  Users,
  ImageIcon,
} from "lucide-react";
import { adminApi } from "@/services/admin-api";
import { PortalAdminPage } from "@/components/portal/PortalAdminPage";
import { StatCard, StatCardGrid } from "@/components/common/AnalyticsChart";

export default function AdminDashboardPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => adminApi.getDashboard(),
  });

  const galleryQuery = useQuery({
    queryKey: ["admin-gallery-stats"],
    queryFn: () => adminApi.getGalleryStats(),
  });

  const pageLoading = isLoading;
  const pageError = error;

  return (
    <PortalAdminPage
      title="Tổng quan hệ thống"
      description="Theo dõi brand, sản phẩm chờ duyệt, hoạt động AI và thư viện ảnh trên nền tảng."
      isLoading={pageLoading}
      error={pageError}
      onRetry={() => refetch()}
      skeleton="card"
    >
      {data && (
        <StatCardGrid>
          <StatCard label="Tổng brand" value={data.totalBrands} sub={`${data.pendingBrands} chờ duyệt`} icon={<Building2 className="h-5 w-5" />} tone="violet" />
          <StatCard label="Tổng sản phẩm" value={data.totalProducts} sub={`${data.pendingProducts} chờ duyệt`} icon={<Package className="h-5 w-5" />} tone="sky" />
          <StatCard label="Link lỗi" value={data.flaggedLinks} icon={<Flag className="h-5 w-5" />} tone="rose" />
          <StatCard label="Người dùng" value={data.totalUsers} sub={`${data.activeUsers} hoạt động 30 ngày`} icon={<Users className="h-5 w-5" />} tone="emerald" />
          <StatCard label="Tư vấn AI" value={data.totalRecommendations} icon={<Sparkles className="h-5 w-5" />} tone="indigo" />
          <StatCard label="Thử mặc AI" value={data.totalTryOns} icon={<Shirt className="h-5 w-5" />} tone="amber" />
        </StatCardGrid>
      )}

      <div className="mt-8 space-y-3">
        <h2 className="font-display text-lg font-semibold text-foreground">Thư viện ảnh phối đồ</h2>
        {galleryQuery.isLoading && null}
        {galleryQuery.data && (
          <StatCardGrid className="lg:grid-cols-3">
            <StatCard label="Tổng ảnh" value={galleryQuery.data.totalImages} icon={<ImageIcon className="h-5 w-5" />} tone="violet" />
            <StatCard label="Ảnh 7 ngày qua" value={galleryQuery.data.imagesLast7Days} icon={<ImageIcon className="h-5 w-5" />} tone="sky" />
            <StatCard label="User có ảnh" value={galleryQuery.data.usersWithImages} icon={<Users className="h-5 w-5" />} tone="emerald" />
          </StatCardGrid>
        )}
      </div>
    </PortalAdminPage>
  );
}
