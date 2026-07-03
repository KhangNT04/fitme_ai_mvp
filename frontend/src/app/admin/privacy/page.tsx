"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/services/admin-api";
import { PortalAdminPage } from "@/components/portal/PortalAdminPage";
import { PortalActionButton } from "@/components/portal/PortalActionButton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PortalDataTable,
  PortalDataTableBody,
  PortalDataTableHead,
  portalTableTdClass,
  portalTableThClass,
} from "@/components/portal/PortalDataTable";
import {
  portalCardActionsClass,
  portalCardClass,
  portalCardListClass,
  portalCardRowClass,
} from "@/lib/design-tokens";
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
    <PortalAdminPage
      title="Quyền riêng tư & Consent"
      description="Theo dõi nhật ký đồng ý và yêu cầu xóa dữ liệu của người dùng."
    >
      <Tabs defaultValue="consents" className="space-y-4">
        <TabsList>
          <TabsTrigger value="consents">Nhật ký consent</TabsTrigger>
          <TabsTrigger value="deletions">Yêu cầu xóa dữ liệu</TabsTrigger>
        </TabsList>
        <TabsContent value="consents">
          {loadingConsents ? null : (
            <PortalDataTable showOnMobile>
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
          {loadingDeletions ? null : (
            <>
              <div className={portalCardListClass}>
                {deletions?.map((d) => (
                  <article key={d.id} className={portalCardClass}>
                    <div className={portalCardRowClass}>
                      <div className="text-sm">
                        <p className="font-medium">ID: {d.id}</p>
                        <p className="mt-1 text-muted-foreground">Loại: {d.requestType}</p>
                        <Badge variant="outline" className="mt-2">{d.status}</Badge>
                      </div>
                    </div>
                    {d.id && d.status !== "COMPLETED" && (
                      <div className={portalCardActionsClass}>
                        <PortalActionButton variant="resolve" onClick={() => processDeletion.mutate(d.id!)}>
                          Xử lý
                        </PortalActionButton>
                      </div>
                    )}
                  </article>
                ))}
              </div>
              <PortalDataTable showOnMobile className="mt-6">
                <PortalDataTableHead>
                  <tr>
                    <th className={portalTableThClass}>ID</th>
                    <th className={portalTableThClass}>Loại</th>
                    <th className={portalTableThClass}>Trạng thái</th>
                    <th className={portalTableThClass}>Thao tác</th>
                  </tr>
                </PortalDataTableHead>
                <PortalDataTableBody>
                  {deletions?.map((d) => (
                    <tr key={d.id}>
                      <td className={`${portalTableTdClass} font-mono text-xs`}>{d.id}</td>
                      <td className={portalTableTdClass}>{d.requestType}</td>
                      <td className={portalTableTdClass}>
                        <Badge variant="outline">{d.status}</Badge>
                      </td>
                      <td className={portalTableTdClass}>
                        {d.id && d.status !== "COMPLETED" ? (
                          <PortalActionButton
                            variant="resolve"
                            onClick={() => processDeletion.mutate(d.id!)}
                          >
                            Xử lý
                          </PortalActionButton>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                  {(!deletions || deletions.length === 0) && (
                    <tr>
                      <td colSpan={4} className={`${portalTableTdClass} text-muted-foreground`}>
                        Không có yêu cầu xóa dữ liệu
                      </td>
                    </tr>
                  )}
                </PortalDataTableBody>
              </PortalDataTable>
            </>
          )}
        </TabsContent>
      </Tabs>
    </PortalAdminPage>
  );
}
