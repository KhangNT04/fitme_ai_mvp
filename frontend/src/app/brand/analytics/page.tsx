"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { brandApi } from "@/services/brand-api";
import { PortalLayout, brandNav } from "@/components/layout/PortalLayout";
import { AnalyticsChart } from "@/components/common/AnalyticsChart";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function BrandAnalyticsPage() {
  const { data } = useQuery({
    queryKey: ["brand-analytics"],
    queryFn: () => brandApi.getAnalyticsRedirect(),
  });

  return (
    <PortalLayout title="Brand" nav={brandNav}>
      <h1 className="text-2xl font-bold">Phân tích</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {[
          { href: "/brand/analytics/redirect", label: "Chuyển hướng mua" },
          { href: "/brand/analytics/dropoff", label: "Điểm rời bỏ" },
          { href: "/brand/analytics/hesitation", label: "Do dự" },
          { href: "/brand/analytics/try-on", label: "Thử mặc AI" },
        ].map((item) => (
          <Card key={item.href}>
            <CardContent className="flex items-center justify-between p-6">
              <span className="font-medium">{item.label}</span>
              <Button variant="outline" size="sm" asChild><Link href={item.href}>Xem</Link></Button>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-8">
        <AnalyticsChart title="Tổng quan chuyển hướng" data={data?.redirectClicks || []} />
      </div>
    </PortalLayout>
  );
}
