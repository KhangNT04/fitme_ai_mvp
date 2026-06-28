"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/services/admin-api";
import { PortalLayout, adminNav } from "@/components/layout/PortalLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";

function statusLabel(status: string) {
  if (status === "OPEN") return "Chờ xử lý";
  return status;
}

export default function AdminFlaggedLinksPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-flagged-links"],
    queryFn: () => adminApi.getFlaggedLinks(),
  });

  const resolve = useMutation({
    mutationFn: (id: string) => adminApi.resolveFlaggedLink(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-flagged-links"] }),
  });

  const reject = useMutation({
    mutationFn: (id: string) => adminApi.rejectFlaggedLink(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-flagged-links"] }),
  });

  return (
    <PortalLayout title="Admin" nav={adminNav}>
      <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">Link bị báo lỗi</h1>
      {isLoading ? <LoadingSkeleton type="list" /> : (
        <div className="mt-8 overflow-x-auto rounded-2xl border border-border/60">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left">Sản phẩm</th>
                <th className="px-4 py-3 text-left">URL</th>
                <th className="px-4 py-3 text-left">Lý do</th>
                <th className="px-4 py-3 text-left">Trạng thái</th>
                <th className="px-4 py-3 text-left">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {data?.map((link) => (
                <tr key={link.id} className="border-t">
                  <td className="px-4 py-3">{link.productName}</td>
                  <td className="px-4 py-3 max-w-xs truncate">{link.url}</td>
                  <td className="px-4 py-3">{link.reason}</td>
                  <td className="px-4 py-3"><Badge variant="outline">{statusLabel(link.status)}</Badge></td>
                  <td className="px-4 py-3 space-x-2">
                    {(link.status === "OPEN" || link.status === "PENDING") && (
                      <>
                        <Button size="sm" onClick={() => resolve.mutate(link.id)}>Xử lý</Button>
                        <Button size="sm" variant="outline" onClick={() => reject.mutate(link.id)}>Từ chối</Button>
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
