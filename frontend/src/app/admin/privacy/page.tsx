"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/services/admin-api";
import { PortalLayout, adminNav } from "@/components/layout/PortalLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";

export default function AdminPrivacyPage() {
  const queryClient = useQueryClient();

  const { data: consents, isLoading: loadingConsents } = useQuery({
    queryKey: ["admin-consents"],
    queryFn: () => adminApi.getConsents(),
  });

  const { data: deletions, isLoading: loadingDeletions } = useQuery({
    queryKey: ["admin-deletions"],
    queryFn: () => adminApi.getDeletionRequests(),
  });

  const processDeletion = useMutation({
    mutationFn: (id: string) => adminApi.processDeletionRequest(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-deletions"] }),
  });

  return (
    <PortalLayout title="Admin" nav={adminNav}>
      <h1 className="text-2xl font-bold">Quyền riêng tư & Consent</h1>
      <Tabs defaultValue="consents" className="mt-8">
        <TabsList>
          <TabsTrigger value="consents">Consent logs</TabsTrigger>
          <TabsTrigger value="deletions">Yêu cầu xóa dữ liệu</TabsTrigger>
        </TabsList>
        <TabsContent value="consents">
          {loadingConsents ? <LoadingSkeleton type="list" /> : (
            <div className="rounded-lg border p-4 text-sm text-stone-600">
              {Array.isArray(consents) && consents.length > 0
                ? `${consents.length} bản ghi consent`
                : "Chưa có bản ghi consent"}
            </div>
          )}
        </TabsContent>
        <TabsContent value="deletions">
          {loadingDeletions ? <LoadingSkeleton type="list" /> : (
            <div className="space-y-3">
              {Array.isArray(deletions) && deletions.map((d, i) => {
                const item = d as { id?: string };
                return (
                <div key={item.id || i} className="flex items-center justify-between rounded-lg border p-4">
                  <span className="text-sm">Yêu cầu xóa #{item.id || i + 1}</span>
                  {item.id && (
                    <Button size="sm" onClick={() => processDeletion.mutate(item.id!)}>Xử lý</Button>
                  )}
                </div>
              );})}
              {(!deletions || (Array.isArray(deletions) && deletions.length === 0)) && (
                <p className="text-sm text-stone-500">Không có yêu cầu xóa dữ liệu</p>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </PortalLayout>
  );
}
