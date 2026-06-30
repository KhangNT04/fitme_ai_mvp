"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi, getProductModerationWarnings } from "@/services/admin-api";
import { PortalLayout, adminNav } from "@/components/layout/PortalLayout";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { ErrorState } from "@/components/common/ErrorState";
import { formatPrice } from "@/utils/format-price";
import {
  portalCardActionsClass,
  portalCardClass,
  portalCardListClass,
  portalCardRowClass,
  portalTableShellClass,
} from "@/lib/design-tokens";

export default function AdminProductModerationPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-pending-products"],
    queryFn: () => adminApi.getPendingProducts(),
  });

  const approve = useMutation({
    mutationFn: (id: string) => adminApi.approveProduct(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-pending-products"] }),
  });

  const reject = useMutation({
    mutationFn: (id: string) => adminApi.rejectProduct(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-pending-products"] }),
  });

  const flag = useMutation({
    mutationFn: (id: string) => adminApi.flagProduct(id, "Admin flagged"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-pending-products"] }),
  });

  return (
    <PortalLayout title="Admin" nav={adminNav}>
      <PortalPageHeader title="Duyệt sản phẩm" description="Kiểm tra ảnh, giá và thông tin trước khi hiển thị công khai." />

      {isLoading && <LoadingSkeleton type="list" />}
      {error && <ErrorState onRetry={() => refetch()} />}
      {data && (
        <>
          <div className={portalCardListClass}>
            {data.map((p) => {
              const warnings = getProductModerationWarnings(p);
              const missingImages = !p.images.length;
              return (
                <article key={p.id} className={portalCardClass}>
                  <div className={portalCardRowClass}>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{p.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{p.brandName}</p>
                      <p className="mt-1 text-sm">{formatPrice(p.price)}</p>
                    </div>
                    <Badge>{p.status}</Badge>
                  </div>
                  <div className="mt-2 text-xs">
                    {warnings.length === 0 ? (
                      <span className="text-green-700">Ảnh & thông tin OK</span>
                    ) : (
                      <ul className="space-y-1 text-amber-700">
                        {warnings.map((w) => (
                          <li key={w}>{w}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className={portalCardActionsClass}>
                    <Button size="sm" disabled={missingImages || approve.isPending} onClick={() => approve.mutate(p.id)}>
                      Duyệt
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => reject.mutate(p.id)}>Từ chối</Button>
                    <Button size="sm" variant="destructive" onClick={() => flag.mutate(p.id)}>Gắn cờ</Button>
                  </div>
                </article>
              );
            })}
          </div>

          <div className={portalTableShellClass}>
            <table className="w-full text-sm">
              <thead className="bg-muted/80">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Sản phẩm</th>
                  <th className="px-4 py-3 text-left font-medium">Brand</th>
                  <th className="px-4 py-3 text-left font-medium">Giá</th>
                  <th className="px-4 py-3 text-left font-medium">Ảnh</th>
                  <th className="px-4 py-3 text-left font-medium">Cảnh báo</th>
                  <th className="px-4 py-3 text-left font-medium">Trạng thái</th>
                  <th className="px-4 py-3 text-left font-medium">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {data.map((p) => {
                  const warnings = getProductModerationWarnings(p);
                  const missingImages = !p.images.length;
                  return (
                    <tr key={p.id} className="border-t border-border/60">
                      <td className="px-4 py-3">{p.name}</td>
                      <td className="px-4 py-3">{p.brandName}</td>
                      <td className="px-4 py-3">{formatPrice(p.price)}</td>
                      <td className="px-4 py-3">{p.images.length}</td>
                      <td className="px-4 py-3">
                        {warnings.length === 0 ? (
                          <span className="text-green-700">OK</span>
                        ) : (
                          <ul className="space-y-1 text-xs text-amber-700">
                            {warnings.map((w) => (
                              <li key={w}>{w}</li>
                            ))}
                          </ul>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge>{p.status}</Badge>
                      </td>
                      <td className="space-x-2 px-4 py-3">
                        <Button size="sm" disabled={missingImages || approve.isPending} onClick={() => approve.mutate(p.id)}>
                          Duyệt
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => reject.mutate(p.id)}>Từ chối</Button>
                        <Button size="sm" variant="destructive" onClick={() => flag.mutate(p.id)}>Gắn cờ</Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </PortalLayout>
  );
}
