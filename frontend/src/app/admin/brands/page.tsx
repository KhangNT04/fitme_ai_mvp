"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/services/admin-api";
import { PortalLayout, adminNav } from "@/components/layout/PortalLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";

export default function AdminBrandsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
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
      <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">Quản lý thương hiệu</h1>
      {isLoading ? <LoadingSkeleton type="list" /> : (
        <div className="mt-8 overflow-x-auto rounded-2xl border border-border/60">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left">Tên</th>
                <th className="px-4 py-3 text-left">Email liên hệ</th>
                <th className="px-4 py-3 text-left">Trạng thái</th>
                <th className="px-4 py-3 text-left">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {data?.map((b) => (
                <tr key={b.id} className="border-t">
                  <td className="px-4 py-3">{b.name}</td>
                  <td className="px-4 py-3">{b.contactEmail ?? "—"}</td>
                  <td className="px-4 py-3"><Badge variant="outline">{b.status}</Badge></td>
                  <td className="px-4 py-3 space-x-2">
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
      )}
    </PortalLayout>
  );
}
