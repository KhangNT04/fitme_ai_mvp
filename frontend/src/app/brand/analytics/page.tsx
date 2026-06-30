"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, GitBranch, Hourglass, MousePointerClick, Shirt } from "lucide-react";
import { brandApi } from "@/services/brand-api";
import { PortalLayout, brandNav } from "@/components/layout/PortalLayout";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { AnalyticsChart } from "@/components/common/AnalyticsChart";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const sections = [
  { href: "/brand/analytics/redirect", label: "Chuyển hướng mua", desc: "Click theo kênh Shopee, website...", icon: MousePointerClick },
  { href: "/brand/analytics/dropoff", label: "Điểm rời bỏ", desc: "Bước người dùng bỏ luồng", icon: GitBranch },
  { href: "/brand/analytics/hesitation", label: "Do dự", desc: "Sản phẩm xem lâu nhưng ít mua", icon: Hourglass },
  { href: "/brand/analytics/try-on", label: "Thử mặc AI", desc: "Lượt thử và màu phổ biến", icon: Shirt },
] as const;

export default function BrandAnalyticsPage() {
  const { data } = useQuery({
    queryKey: ["brand-analytics"],
    queryFn: () => brandApi.getAnalyticsRedirect(),
  });

  return (
    <PortalLayout title="Brand" nav={brandNav}>
      <PortalPageHeader
        title="Phân tích"
        description="Theo dõi hành vi mua hàng, thử mặc và điểm cần tối ưu."
      />

      <div className="grid gap-3 sm:grid-cols-2">
        {sections.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.href} className="border-border/60 shadow-sm">
              <CardContent className="flex items-center justify-between gap-4 p-5">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{item.label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href={item.href}>
                    Xem
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-6">
        <AnalyticsChart
          title="Tổng quan chuyển hướng"
          description="Cột: lượt click — đường: % trên tổng"
          data={data?.redirectClicks || []}
          barLabel="Lượt click"
          lineLabel="% tổng"
        />
      </div>
    </PortalLayout>
  );
}
