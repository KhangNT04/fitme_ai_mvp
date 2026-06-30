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
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import {
  PortalDataTable,
  PortalDataTableBody,
  PortalDataTableHead,
  portalTableTdClass,
  portalTableThClass,
} from "@/components/portal/PortalDataTable";
import { portalTableActionsClass } from "@/lib/design-tokens";
import { flaggedLinkReasonLabel, flaggedLinkStatusLabel } from "@/lib/status-labels";
import { cn } from "@/lib/utils";
import { actionFeedback } from "@/lib/action-feedback";

export default function AdminFlaggedLinksPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-flagged-links"],
    queryFn: () => adminApi.getFlaggedLinks(),
  });

  const resolve = useMutation({
    mutationFn: (id: string) => adminApi.resolveFlaggedLink(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-flagged-links"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      actionFeedback({ successMessage: "Đã xử lý link" }).onSuccess();
    },
    onError: actionFeedback({ errorMessage: "Không thể xử lý link" }).onError,
  });

  const reject = useMutation({
    mutationFn: (id: string) => adminApi.rejectFlaggedLink(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-flagged-links"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      actionFeedback({ successMessage: "Đã từ chối báo lỗi" }).onSuccess();
    },
    onError: actionFeedback({ errorMessage: "Không thể từ chối báo lỗi" }).onError,
  });

  const openLinks = data?.filter((link) => link.status === "OPEN" || link.status === "PENDING") ?? [];

  return (
    <PortalLayout title="Admin" nav={adminNav}>
      <PortalPageHeader
        title="Link bị gắn cờ"
        description="Các link mua hàng bị báo lỗi khi người dùng nhấn Mua — thiếu URL, link hỏng hoặc không chuyển hướng được."
      />

      {isLoading && <LoadingSkeleton type="list" />}
      {error && <ErrorState onRetry={() => refetch()} />}
      {!isLoading && !error && openLinks.length === 0 && (
        <EmptyState
          title="Chưa có link bị gắn cờ"
          description="Hệ thống tự ghi nhận khi người dùng nhấn Mua nhưng sản phẩm thiếu link hoặc URL không hợp lệ. Admin có thể xử lý hoặc từ chối tại đây."
        />
      )}
      {!isLoading && !error && openLinks.length > 0 && (
        <PortalDataTable showOnMobile>
          <PortalDataTableHead>
            <tr>
              <th className={portalTableThClass}>Sản phẩm</th>
              <th className={portalTableThClass}>URL</th>
              <th className={portalTableThClass}>Lý do</th>
              <th className={portalTableThClass}>Trạng thái</th>
              <th className={portalTableThClass}>Thao tác</th>
            </tr>
          </PortalDataTableHead>
          <PortalDataTableBody>
            {openLinks.map((link) => (
              <tr key={link.id}>
                <td className={portalTableTdClass}>{link.productName}</td>
                <td className={cn(portalTableTdClass, "max-w-xs truncate")}>{link.url || "—"}</td>
                <td className={portalTableTdClass}>{flaggedLinkReasonLabel(link.reason)}</td>
                <td className={portalTableTdClass}>
                  <Badge variant="outline">{flaggedLinkStatusLabel(link.status)}</Badge>
                </td>
                <td className={portalTableTdClass}>
                  <PortalActionGroup className={portalTableActionsClass}>
                    <PortalActionButton variant="resolve" onClick={() => resolve.mutate(link.id)}>
                      Xử lý
                    </PortalActionButton>
                    <PortalActionButton variant="reject" onClick={() => reject.mutate(link.id)}>
                      Từ chối
                    </PortalActionButton>
                  </PortalActionGroup>
                </td>
              </tr>
            ))}
          </PortalDataTableBody>
        </PortalDataTable>
      )}
    </PortalLayout>
  );
}
