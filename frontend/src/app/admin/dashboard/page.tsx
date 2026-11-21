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
  ArrowRight,
} from "lucide-react";
import { adminApi } from "@/services/admin-api";
import { PortalAdminPage } from "@/components/portal/PortalAdminPage";
import { PortalSection } from "@/components/portal/PortalSection";
import { StatCard, StatCardGrid } from "@/components/common/AnalyticsChart";
import { FashnLowCreditBanner } from "@/components/admin/FashnCreditsCard";
import { Button } from "@/components/ui/button";

export default function AdminDashboardPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => adminApi.getDashboard(),
  });

  const galleryQuery = useQuery({
    queryKey: ["admin-gallery-stats"],
    queryFn: () => adminApi.getGalleryStats(),
  });

  return (
    <PortalAdminPage
      title="Tổng quan hệ thống"
      description="Ưu tiên việc cần xử lý hôm nay, rồi theo dõi sức khỏe nền tảng."
      isLoading={isLoading}
      error={error}
      onRetry={() => refetch()}
      skeleton="card"
    >
      <FashnLowCreditBanner className="mb-6" />

      {data && (
        <div className="space-y-8">
          <PortalSection
            title="Cần chú ý"
            description="Các hàng đợi ảnh hưởng trực tiếp trải nghiệm brand và người dùng."
            actions={
              <Button asChild variant="ghost" size="sm" className="gap-1 text-primary">
                <Link href="/admin/products/moderation">
                  Duyệt sản phẩm
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            }
          >
            <StatCardGrid className="lg:grid-cols-3">
              <StatCard
                label="Brand chờ duyệt"
                value={data.pendingBrands}
                sub={`${data.totalBrands} brand tổng`}
                icon={<Building2 className="h-5 w-5" />}
                tone="amber"
              />
              <StatCard
                label="Sản phẩm chờ duyệt"
                value={data.pendingProducts}
                sub={`${data.totalProducts} sản phẩm tổng`}
                icon={<Package className="h-5 w-5" />}
                tone="rose"
              />
              <StatCard
                label="Link bị gắn cờ"
                value={data.flaggedLinks}
                icon={<Flag className="h-5 w-5" />}
                tone="rose"
              />
            </StatCardGrid>
          </PortalSection>

          <PortalSection
            title="Sức khỏe nền tảng"
            description="Hoạt động người dùng và AI trong giai sóng gần đây."
          >
            <StatCardGrid>
              <StatCard
                label="Người dùng"
                value={data.totalUsers}
                sub={`${data.activeUsers} hoạt động 30 ngày`}
                icon={<Users className="h-5 w-5" />}
                tone="emerald"
              />
              <StatCard
                label="Tư vấn AI"
                value={data.totalRecommendations}
                icon={<Sparkles className="h-5 w-5" />}
                tone="indigo"
              />
              <StatCard
                label="Thử mặc AI"
                value={data.totalTryOns}
                icon={<Shirt className="h-5 w-5" />}
                tone="sky"
              />
              <StatCard
                label="Thương hiệu"
                value={data.totalBrands}
                icon={<Building2 className="h-5 w-5" />}
                tone="violet"
              />
            </StatCardGrid>
          </PortalSection>

          <PortalSection title="Thư viện ảnh phối đồ">
            {galleryQuery.data ? (
              <StatCardGrid className="lg:grid-cols-3">
                <StatCard
                  label="Tổng ảnh"
                  value={galleryQuery.data.totalImages}
                  icon={<ImageIcon className="h-5 w-5" />}
                  tone="violet"
                />
                <StatCard
                  label="Ảnh 7 ngày qua"
                  value={galleryQuery.data.imagesLast7Days}
                  icon={<ImageIcon className="h-5 w-5" />}
                  tone="sky"
                />
                <StatCard
                  label="User có ảnh"
                  value={galleryQuery.data.usersWithImages}
                  icon={<Users className="h-5 w-5" />}
                  tone="emerald"
                />
              </StatCardGrid>
            ) : null}
          </PortalSection>
        </div>
      )}
    </PortalAdminPage>
  );
}
