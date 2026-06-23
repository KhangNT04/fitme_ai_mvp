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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-brands"] }),
  });

  const reject = useMutation({
    mutationFn: (id: string) => adminApi.rejectBrand(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-brands"] }),
  });

  return (
    <PortalLayout title="Admin" nav={adminNav}>
      <h1 className="text-2xl font-bold">Quản lý thương hiệu</h1>
      {isLoading ? <LoadingSkeleton type="list" /> : (
        <div className="mt-8 overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-stone-50">
              <tr>
                <th className="px-4 py-3 text-left">Tên</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Trạng thái</th>
                <th className="px-4 py-3 text-left">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {data?.map((b) => (
                <tr key={b.id} className="border-t">
                  <td className="px-4 py-3">{b.name}</td>
                  <td className="px-4 py-3">{b.email}</td>
                  <td className="px-4 py-3"><Badge variant="outline">{b.status}</Badge></td>
                  <td className="px-4 py-3 space-x-2">
                    {b.status === "PENDING" && (
                      <>
                        <Button size="sm" onClick={() => approve.mutate(b.id)}>Duyệt</Button>
                        <Button size="sm" variant="outline" onClick={() => reject.mutate(b.id)}>Từ chối</Button>
                      </>
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
