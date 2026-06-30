"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/services/admin-api";
import { PortalLayout, adminNav } from "@/components/layout/PortalLayout";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { ErrorState } from "@/components/common/ErrorState";
import {
  portalCardActionsClass,
  portalCardClass,
  portalCardListClass,
  portalCardRowClass,
  portalTableShellClass,
} from "@/lib/design-tokens";

export default function AdminBrandsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-brands"],
    queryFn: () => adminApi.getBrands(),
  });

  const approve = useMutation({
    mutationFn: (id: string) => adminApi.approveBrand(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-brands"] });
      alert("Brand đã duyệt. Chủ brand cần đăng nhập lại để nhận quyền BRAND_OWNER.");
    },
  });

  const reject = useMutation({
    mutationFn: (id: string) => adminApi.rejectBrand(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-brands"] }),
  });

  const suspend = useMutation({
    mutationFn: (id: string) => adminApi.suspendBrand(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-brands"] }),
  });

  return (
    <PortalLayout title="Admin" nav={adminNav}>
      <PortalPageHeader title="Quản lý thương hiệu" description="Duyệt đăng ký mới và quản lý trạng thái brand." />

      {isLoading && <LoadingSkeleton type="list" />}
      {error && <ErrorState onRetry={() => refetch()} />}
      {data && (
        <>
          <div className={portalCardListClass}>
            {data.map((b) => (
              <article key={b.id} className={portalCardClass}>
                <div className={portalCardRowClass}>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{b.name}</p>
                    <p className="mt-1 truncate text-sm text-muted-foreground">{b.contactEmail ?? "—"}</p>
                  </div>
                  <Badge variant="outline">{b.status}</Badge>
                </div>
                <div className={portalCardActionsClass}>
                  {b.status === "PENDING" && (
                    <>
                      <Button size="sm" onClick={() => approve.mutate(b.id)}>Duyệt</Button>
                      <Button size="sm" variant="outline" onClick={() => reject.mutate(b.id)}>Từ chối</Button>
                    </>
                  )}
                  {b.status === "APPROVED" && (
                    <Button size="sm" variant="destructive" onClick={() => suspend.mutate(b.id)}>Tạm ngưng</Button>
                  )}
                </div>
              </article>
            ))}
          </div>

          <div className={portalTableShellClass}>
            <table className="w-full text-sm">
              <thead className="bg-muted/80">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Tên</th>
                  <th className="px-4 py-3 text-left font-medium">Email liên hệ</th>
                  <th className="px-4 py-3 text-left font-medium">Trạng thái</th>
                  <th className="px-4 py-3 text-left font-medium">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {data.map((b) => (
                  <tr key={b.id} className="border-t border-border/60">
                    <td className="px-4 py-3">{b.name}</td>
                    <td className="px-4 py-3">{b.contactEmail ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{b.status}</Badge>
                    </td>
                    <td className="space-x-2 px-4 py-3">
                      {b.status === "PENDING" && (
                        <>
                          <Button size="sm" onClick={() => approve.mutate(b.id)}>Duyệt</Button>
                          <Button size="sm" variant="outline" onClick={() => reject.mutate(b.id)}>Từ chối</Button>
                        </>
                      )}
                      {b.status === "APPROVED" && (
                        <Button size="sm" variant="destructive" onClick={() => suspend.mutate(b.id)}>Tạm ngưng</Button>
                      )}
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
