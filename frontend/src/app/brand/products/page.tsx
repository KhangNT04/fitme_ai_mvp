"use client";

import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { brandApi } from "@/services/brand-api";
import { PortalLayout, brandNav } from "@/components/layout/PortalLayout";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { ErrorState } from "@/components/common/ErrorState";
import { EmptyState } from "@/components/common/EmptyState";
import { formatPrice } from "@/utils/format-price";
import {
  portalCardActionsClass,
  portalCardClass,
  portalCardListClass,
  portalCardRowClass,
  portalTableShellClass,
} from "@/lib/design-tokens";

export default function BrandProductsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["brand-products"],
    queryFn: () => brandApi.getProducts(),
  });

  const remove = useMutation({
    mutationFn: (id: string) => brandApi.deleteProduct(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["brand-products"] }),
  });

  return (
    <PortalLayout title="Brand" nav={brandNav}>
      <PortalPageHeader title="Quản lý sản phẩm" description="Thêm, chỉnh sửa và theo dõi sản phẩm của thương hiệu.">
        <Button asChild>
          <Link href="/brand/products/new">
            <Plus className="mr-2 h-4 w-4" />
            Thêm sản phẩm
          </Link>
        </Button>
      </PortalPageHeader>

      {isLoading && <LoadingSkeleton type="list" />}
      {error && <ErrorState onRetry={() => refetch()} />}
      {data && data.length === 0 && (
        <EmptyState title="Chưa có sản phẩm" actionLabel="Thêm sản phẩm" actionHref="/brand/products/new" />
      )}
      {data && data.length > 0 && (
        <>
          <div className={portalCardListClass}>
            {data.map((p) => (
              <article key={p.id} className={portalCardClass}>
                <div className={portalCardRowClass}>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{p.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{formatPrice(p.price)}</p>
                  </div>
                  <Badge variant="outline">{p.status}</Badge>
                </div>
                <div className={portalCardActionsClass}>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/brand/products/${p.id}/edit`}>Sửa</Link>
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/brand/products/${p.id}/analytics`}>Phân tích</Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      if (confirm("Xóa sản phẩm này?")) remove.mutate(p.id);
                    }}
                  >
                    Xóa
                  </Button>
                </div>
              </article>
            ))}
          </div>

          <div className={portalTableShellClass}>
            <table className="w-full text-sm">
              <thead className="bg-muted/80">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Tên</th>
                  <th className="px-4 py-3 text-left font-medium">Giá</th>
                  <th className="px-4 py-3 text-left font-medium">Trạng thái</th>
                  <th className="px-4 py-3 text-left font-medium">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {data.map((p) => (
                  <tr key={p.id} className="border-t border-border/60">
                    <td className="px-4 py-3">{p.name}</td>
                    <td className="px-4 py-3">{formatPrice(p.price)}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{p.status}</Badge>
                    </td>
                    <td className="space-x-3 px-4 py-3">
                      <Link href={`/brand/products/${p.id}/edit`} className="text-muted-foreground hover:text-foreground hover:underline">
                        Sửa
                      </Link>
                      <Link href={`/brand/products/${p.id}/analytics`} className="text-muted-foreground hover:text-foreground hover:underline">
                        Phân tích
                      </Link>
                      <button
                        type="button"
                        className="text-destructive hover:underline"
                        onClick={() => {
                          if (confirm("Xóa sản phẩm này?")) remove.mutate(p.id);
                        }}
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </PortalLayout>
  );
}
