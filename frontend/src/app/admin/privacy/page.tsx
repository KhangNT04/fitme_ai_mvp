"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/services/admin-api";
import { PortalLayout, adminNav } from "@/components/layout/PortalLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";

interface ConsentRecord {
  id?: string;
  consentType?: string;
  granted?: boolean;
  createdAt?: string;
}

interface DeletionRequest {
  id?: string;
  requestType?: string;
  status?: string;
  createdAt?: string;
}

export default function AdminPrivacyPage() {
  const queryClient = useQueryClient();

  const { data: consents, isLoading: loadingConsents } = useQuery({
    queryKey: ["admin-consents"],
    queryFn: () => adminApi.getConsents() as Promise<ConsentRecord[]>,
  });

  const { data: deletions, isLoading: loadingDeletions } = useQuery({
    queryKey: ["admin-deletions"],
    queryFn: () => adminApi.getDeletionRequests() as Promise<DeletionRequest[]>,
  });

  const processDeletion = useMutation({
    mutationFn: (id: string) => adminApi.processDeletionRequest(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-deletions"] }),
  });

  return (
    <PortalLayout title="Admin" nav={adminNav}>
      <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">Quyền riêng tư & Consent</h1>
      <Tabs defaultValue="consents" className="mt-8">
        <TabsList>
          <TabsTrigger value="consents">Consent logs</TabsTrigger>
          <TabsTrigger value="deletions">Yêu cầu xóa dữ liệu</TabsTrigger>
        </TabsList>
        <TabsContent value="consents">
          {loadingConsents ? <LoadingSkeleton type="list" /> : (
            <div className="overflow-x-auto rounded-2xl border border-border/60">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-3 text-left">Loại</th>
                    <th className="px-4 py-3 text-left">Đồng ý</th>
                    <th className="px-4 py-3 text-left">Thời gian</th>
                  </tr>
                </thead>
                <tbody>
                  {consents?.map((c, i) => (
                    <tr key={c.id ?? i} className="border-t">
                      <td className="px-4 py-3">{c.consentType ?? "—"}</td>
                      <td className="px-4 py-3"><Badge variant="outline">{c.granted ? "Có" : "Không"}</Badge></td>
                      <td className="px-4 py-3">{c.createdAt ? new Date(c.createdAt).toLocaleString("vi-VN") : "—"}</td>
                    </tr>
                  ))}
                  {(!consents || consents.length === 0) && (
                    <tr><td colSpan={3} className="px-4 py-3 text-muted-foreground">Chưa có bản ghi consent</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
        <TabsContent value="deletions">
          {loadingDeletions ? <LoadingSkeleton type="list" /> : (
            <div className="space-y-3">
              {deletions?.map((d) => (
                <div key={d.id} className="flex items-center justify-between rounded-2xl border border-border/60 p-4">
                  <div className="text-sm">
                    <p><strong>ID:</strong> {d.id}</p>
                    <p><strong>Loại:</strong> {d.requestType}</p>
                    <p><strong>Trạng thái:</strong> {d.status}</p>
                  </div>
                  {d.id && d.status !== "COMPLETED" && (
                    <Button size="sm" onClick={() => processDeletion.mutate(d.id!)}>Xử lý</Button>
                  )}
                </div>
              ))}
              {(!deletions || deletions.length === 0) && (
                <p className="text-sm text-muted-foreground">Không có yêu cầu xóa dữ liệu</p>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </PortalLayout>
  );
}
