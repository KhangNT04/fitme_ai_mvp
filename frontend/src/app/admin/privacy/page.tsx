"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/services/admin-api";
import { PortalLayout, adminNav } from "@/components/layout/PortalLayout";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { PortalActionButton } from "@/components/portal/PortalActionButton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import {
  PortalDataTable,
  PortalDataTableBody,
  PortalDataTableHead,
  portalTableTdClass,
  portalTableThClass,
} from "@/components/portal/PortalDataTable";
import { actionFeedback } from "@/lib/action-feedback";

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-deletions"] });
      actionFeedback({ successMessage: "Đã xử lý yêu cầu xóa dữ liệu" }).onSuccess();
    },
    onError: actionFeedback({ errorMessage: "Không thể xử lý yêu cầu" }).onError,
  });

  return (
    <PortalLayout title="Admin" nav={adminNav}>
      <PortalPageHeader title="Quyền riêng tư & Consent" />
      <Tabs defaultValue="consents">
        <TabsList>
          <TabsTrigger value="consents">Consent logs</TabsTrigger>
          <TabsTrigger value="deletions">Yêu cầu xóa dữ liệu</TabsTrigger>
        </TabsList>
        <TabsContent value="consents">
          {loadingConsents ? <LoadingSkeleton type="list" /> : (
            <PortalDataTable showOnMobile className="mt-0">
              <PortalDataTableHead>
                <tr>
                  <th className={portalTableThClass}>Loại</th>
                  <th className={portalTableThClass}>Đồng ý</th>
                  <th className={portalTableThClass}>Thời gian</th>
                </tr>
              </PortalDataTableHead>
              <PortalDataTableBody>
                {consents?.map((c, i) => (
                  <tr key={c.id ?? i}>
                    <td className={portalTableTdClass}>{c.consentType ?? "—"}</td>
                    <td className={portalTableTdClass}>
                      <Badge variant="outline">{c.granted ? "Có" : "Không"}</Badge>
                    </td>
                    <td className={portalTableTdClass}>
                      {c.createdAt ? new Date(c.createdAt).toLocaleString("vi-VN") : "—"}
                    </td>
                  </tr>
                ))}
                {(!consents || consents.length === 0) && (
                  <tr>
                    <td colSpan={3} className={`${portalTableTdClass} text-muted-foreground`}>
                      Chưa có bản ghi consent
                    </td>
                  </tr>
                )}
              </PortalDataTableBody>
            </PortalDataTable>
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
                    <PortalActionButton variant="resolve" onClick={() => processDeletion.mutate(d.id!)}>
                      Xử lý
                    </PortalActionButton>
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
