"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, GitBranch, Hourglass, MousePointerClick, Shirt } from "lucide-react";
import { brandApi } from "@/services/brand-api";
import { PortalBrandPage } from "@/components/portal/PortalBrandPage";
import { PortalSection } from "@/components/portal/PortalSection";
import { AnalyticsChart } from "@/components/common/AnalyticsChart";

const sections = [
  { href: "/brand/insights/demand", label: "Nhu cầu Gen Z", desc: "Like, click mua, xác nhận mua (anonymized)", icon: Shirt },
  { href: "/brand/analytics/redirect", label: "Chuyển hướng mua", desc: "Click theo kênh Shopee, website...", icon: MousePointerClick },
  { href: "/brand/analytics/dropoff", label: "Điểm rời bỏ", desc: "Bước người dùng bỏ luồng", icon: GitBranch },
  { href: "/brand/analytics/hesitation", label: "Do dự", desc: "Sản phẩm xem lâu nhưng ít mua", icon: Hourglass },
  { href: "/brand/analytics/try-on", label: "Thử mặc AI", desc: "Lượt thử và màu phổ biến", icon: Shirt },
] as const;

export default function BrandAnalyticsPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["brand-analytics"],
    queryFn: () => brandApi.getAnalyticsRedirect(),
  });

  return (
    <PortalBrandPage
      title="Phân tích"
      description="Theo dõi hành vi mua hàng, thử mặc và điểm cần tối ưu."
      isLoading={isLoading}
      error={error}
      onRetry={() => refetch()}
      skeleton="card"
    >
      <div className="space-y-8">
        <PortalSection title="Báo cáo chi tiết" description="Chọn một góc nhìn để đào sâu.">
          <div className="grid gap-3 sm:grid-cols-2">
            {sections.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{item.label}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </div>
                </Link>
              );
            })}
          </div>
        </PortalSection>

        <PortalSection title="Tổng quan chuyển hướng" description="Cột: lượt click — đường: % trên tổng">
          <AnalyticsChart
            title="Chuyển hướng mua"
            description="Hiệu quả theo kênh"
            data={data?.redirectClicks || []}
            barLabel="Lượt click"
            lineLabel="% tổng"
          />
        </PortalSection>
      </div>
    </PortalBrandPage>
  );
}
