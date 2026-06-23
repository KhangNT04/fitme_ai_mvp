"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { brandApi } from "@/services/brand-api";
import { PortalLayout, brandNav } from "@/components/layout/PortalLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { ErrorState } from "@/components/common/ErrorState";
import { EmptyState } from "@/components/common/EmptyState";
import { formatPrice } from "@/utils/format-price";

export default function BrandProductsPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["brand-products"],
    queryFn: () => brandApi.getProducts(),
  });

  return (
    <PortalLayout title="Brand" nav={brandNav}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Quản lý sản phẩm</h1>
        <Button asChild><Link href="/brand/products/new"><Plus className="mr-2 h-4 w-4" />Thêm sản phẩm</Link></Button>
      </div>
      <div className="mt-8">
        {isLoading && <LoadingSkeleton type="list" />}
        {error && <ErrorState onRetry={() => refetch()} />}
        {data && data.length === 0 && (
          <EmptyState title="Chưa có sản phẩm" actionLabel="Thêm sản phẩm" actionHref="/brand/products/new" />
        )}
        {data && data.length > 0 && (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-stone-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Tên</th>
                  <th className="px-4 py-3 text-left font-medium">Giá</th>
                  <th className="px-4 py-3 text-left font-medium">Trạng thái</th>
                  <th className="px-4 py-3 text-left font-medium">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {data.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="px-4 py-3">{p.name}</td>
                    <td className="px-4 py-3">{formatPrice(p.price)}</td>
                    <td className="px-4 py-3"><Badge variant="outline">{p.status}</Badge></td>
                    <td className="px-4 py-3">
                      <Link href={`/brand/products/${p.id}/edit`} className="text-stone-600 hover:underline mr-3">Sửa</Link>
                      <Link href={`/brand/products/${p.id}/analytics`} className="text-stone-600 hover:underline">Phân tích</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
