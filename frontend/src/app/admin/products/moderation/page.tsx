"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi, getProductModerationWarnings } from "@/services/admin-api";
import { PortalLayout, adminNav } from "@/components/layout/PortalLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { formatPrice } from "@/utils/format-price";

export default function AdminProductModerationPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
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
      <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">Duyệt sản phẩm</h1>
      {isLoading ? <LoadingSkeleton type="list" /> : (
        <div className="mt-8 overflow-x-auto rounded-2xl border border-border/60">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left">Sản phẩm</th>
                <th className="px-4 py-3 text-left">Brand</th>
                <th className="px-4 py-3 text-left">Giá</th>
                <th className="px-4 py-3 text-left">Ảnh</th>
                <th className="px-4 py-3 text-left">Cảnh báo</th>
                <th className="px-4 py-3 text-left">Trạng thái</th>
                <th className="px-4 py-3 text-left">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {data?.map((p) => {
                const warnings = getProductModerationWarnings(p);
                const missingImages = !p.images.length;
                return (
                  <tr key={p.id} className="border-t">
                    <td className="px-4 py-3">{p.name}</td>
                    <td className="px-4 py-3">{p.brandName}</td>
                    <td className="px-4 py-3">{formatPrice(p.price)}</td>
                    <td className="px-4 py-3">{p.images.length}</td>
                    <td className="px-4 py-3">
                      {warnings.length === 0 ? (
                        <span className="text-green-700">OK</span>
                      ) : (
                        <ul className="text-xs text-amber-700 space-y-1">
                          {warnings.map((w) => <li key={w}>{w}</li>)}
                        </ul>
                      )}
                    </td>
                    <td className="px-4 py-3"><Badge>{p.status}</Badge></td>
                    <td className="px-4 py-3 space-x-2">
                      <Button size="sm" disabled={missingImages || approve.isPending} onClick={() => approve.mutate(p.id)}>
                        Duyệt
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => reject.mutate(p.id)}>Từ chối</Button>
                      <Button size="sm" variant="destructive" onClick={() => flag.mutate(p.id)}>Flag</Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </PortalLayout>
  );
}
