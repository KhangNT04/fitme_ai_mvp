"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  Flag,
  Package,
  Shirt,
  Sparkles,
  Users,
  ImageIcon,
  ShoppingCart,
  Coins,
  Wallet,
} from "lucide-react";
import { adminApi } from "@/services/admin-api";
import { PortalAdminPage } from "@/components/portal/PortalAdminPage";
import { StatCard, StatCardGrid } from "@/components/common/AnalyticsChart";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/utils/format-price";

export default function AdminDashboardPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => adminApi.getDashboard(),
  });

  const galleryQuery = useQuery({
    queryKey: ["admin-gallery-stats"],
    queryFn: () => adminApi.getGalleryStats(),
  });

  const commerceQuery = useQuery({
    queryKey: ["admin-commerce-summary"],
    queryFn: () => adminApi.getCommerceSummary(),
  });

  const pageLoading = isLoading;
  const pageError = error;

  return (
    <PortalAdminPage
      title="Tổng quan hệ thống"
      description="Theo dõi brand, sản phẩm chờ duyệt, hoạt động AI, thư viện ảnh và thương mại trên nền tảng."
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
          <StatCard label="Người dùng" value={data.activeUsers} icon={<Users className="h-5 w-5" />} tone="emerald" />
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

      <div className="mt-8 space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground">Thương mại</h2>
            <p className="text-sm text-muted-foreground">GMV đơn hoàn tất, hoa hồng và khoản chờ đối soát seller.</p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/settlements">Đối soát seller</Link>
          </Button>
        </div>
        {commerceQuery.isLoading && null}
        {commerceQuery.data && (
          <StatCardGrid className="lg:grid-cols-4">
            <StatCard
              label="GMV"
              value={formatPrice(commerceQuery.data.gmvVnd)}
              icon={<ShoppingCart className="h-5 w-5" />}
              tone="emerald"
            />
            <StatCard
              label="Hoa hồng"
              value={formatPrice(commerceQuery.data.commissionVnd)}
              icon={<Coins className="h-5 w-5" />}
              tone="amber"
            />
            <StatCard
              label="Số đơn"
              value={commerceQuery.data.ordersCount}
              icon={<Package className="h-5 w-5" />}
              tone="sky"
            />
            <StatCard
              label="Chờ đối soát"
              value={formatPrice(commerceQuery.data.pendingSettlementVnd)}
              icon={<Wallet className="h-5 w-5" />}
              tone="rose"
            />
          </StatCardGrid>
        )}
      </div>
    </PortalAdminPage>
  );
}
