"use client";

import { useQuery } from "@tanstack/react-query";
import { brandApi } from "@/services/brand-api";
import { PortalLayout, brandNav } from "@/components/layout/PortalLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";

export default function BrandSettingsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["brand-me"],
    queryFn: () => brandApi.getMe(),
  });

  return (
    <PortalLayout title="Brand" nav={brandNav}>
      <h1 className="text-2xl font-bold">Cài đặt thương hiệu</h1>
      {isLoading ? <LoadingSkeleton count={1} /> : data && (
        <Card className="mt-8">
          <CardHeader><CardTitle>{data.name}</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><strong>Chủ sở hữu:</strong> {data.ownerName}</p>
            <p><strong>Email:</strong> {data.email}</p>
            <p><strong>Danh mục:</strong> {data.productCategory}</p>
            <p><strong>Trạng thái:</strong> <Badge>{data.status}</Badge></p>
            {data.website && <p><strong>Website:</strong> {data.website}</p>}
            {data.shopeeUrl && <p><strong>Shopee:</strong> {data.shopeeUrl}</p>}
          </CardContent>
        </Card>
      )}
    </PortalLayout>
  );
}
