"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/services/admin-api";
import { PortalLayout, adminNav } from "@/components/layout/PortalLayout";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import {
  PortalActionButton,
  PortalActionGroup,
} from "@/components/portal/PortalActionButton";
import { Badge } from "@/components/ui/badge";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { ErrorState } from "@/components/common/ErrorState";
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
  portalTableActionsClass,
} from "@/lib/design-tokens";
import { actionFeedback } from "@/lib/action-feedback";

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
      actionFeedback({
        successMessage: "Đã duyệt thương hiệu. Chủ brand cần đăng nhập lại để nhận quyền.",
      }).onSuccess();
    },
    onError: actionFeedback({ errorMessage: "Không thể duyệt thương hiệu" }).onError,
  });

  const reject = useMutation({
    mutationFn: (id: string) => adminApi.rejectBrand(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-brands"] });
      actionFeedback({ successMessage: "Đã từ chối thương hiệu" }).onSuccess();
    },
    onError: actionFeedback({ errorMessage: "Không thể từ chối thương hiệu" }).onError,
  });

  const suspend = useMutation({
    mutationFn: (id: string) => adminApi.suspendBrand(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-brands"] });
      actionFeedback({ successMessage: "Đã tạm ngưng thương hiệu" }).onSuccess();
    },
    onError: actionFeedback({ errorMessage: "Không thể tạm ngưng thương hiệu" }).onError,
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
                    <p className="mt-1 text-xs text-muted-foreground">
                      Lượt: {b.totalQuotaRemaining ?? 0} · Gói: {b.activePlanName ?? "—"}
                    </p>
                  </div>
                  <Badge variant="outline">{b.status}</Badge>
                </div>
                <PortalActionGroup className={portalCardActionsClass}>
                  {b.status === "PENDING" && (
                    <>
                      <PortalActionButton variant="approve" onClick={() => approve.mutate(b.id)}>
                        Duyệt
                      </PortalActionButton>
                      <PortalActionButton variant="reject" onClick={() => reject.mutate(b.id)}>
                        Từ chối
                      </PortalActionButton>
                    </>
                  )}
                  {b.status === "APPROVED" && (
                    <PortalActionButton variant="suspend" onClick={() => suspend.mutate(b.id)}>
                      Tạm ngưng
                    </PortalActionButton>
                  )}
                </PortalActionGroup>
              </article>
            ))}
          </div>

          <PortalDataTable>
            <PortalDataTableHead>
              <tr>
                <th className={portalTableThClass}>Tên</th>
                <th className={portalTableThClass}>Email liên hệ</th>
                <th className={portalTableThClass}>Trạng thái</th>
                <th className={portalTableThClass}>Lượt còn</th>
                <th className={portalTableThClass}>Gói</th>
                <th className={portalTableThClass}>Thao tác</th>
              </tr>
            </PortalDataTableHead>
            <PortalDataTableBody>
              {data.map((b) => (
                <tr key={b.id}>
                  <td className={portalTableTdClass}>{b.name}</td>
                  <td className={portalTableTdClass}>{b.contactEmail ?? "—"}</td>
                  <td className={portalTableTdClass}>
                    <Badge variant="outline">{b.status}</Badge>
                  </td>
                  <td className={portalTableTdClass}>{b.totalQuotaRemaining ?? "—"}</td>
                  <td className={portalTableTdClass}>{b.activePlanName ?? "—"}</td>
                  <td className={portalTableTdClass}>
                    <PortalActionGroup className={portalTableActionsClass}>
                      {b.status === "PENDING" && (
                        <>
                          <PortalActionButton variant="approve" onClick={() => approve.mutate(b.id)}>
                            Duyệt
                          </PortalActionButton>
                          <PortalActionButton variant="reject" onClick={() => reject.mutate(b.id)}>
                            Từ chối
                          </PortalActionButton>
                        </>
                      )}
                      {b.status === "APPROVED" && (
                        <PortalActionButton variant="suspend" onClick={() => suspend.mutate(b.id)}>
                          Tạm ngưng
                        </PortalActionButton>
                      )}
                    </PortalActionGroup>
                  </td>
                </tr>
              ))}
            </PortalDataTableBody>
          </PortalDataTable>
        </>
      )}
    </PortalLayout>
  );
}
