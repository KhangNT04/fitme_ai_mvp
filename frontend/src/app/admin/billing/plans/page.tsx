"use client";

import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminBillingApi } from "@/services/billing-api";
import { PortalAdminPage } from "@/components/portal/PortalAdminPage";
import {
  PortalActionButton,
  PortalActionGroup,
  PortalActionLink,
} from "@/components/portal/PortalActionButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/utils/format-price";
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

export default function AdminBillingPlansPage() {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-billing-plans"],
    queryFn: () => adminBillingApi.getPlans(),
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminBillingApi.deletePlan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-billing-plans"] });
      actionFeedback({ successMessage: "Đã xóa gói" }).onSuccess();
    },
    onError: actionFeedback({ errorMessage: "Không thể xóa gói" }).onError,
  });

  return (
    <PortalAdminPage
      title="Danh mục gói"
      description="Quản lý gói subscription và top-up trong hệ thống."
      headerActions={
        <Button size="sm" asChild>
          <Link href="/admin/billing/plans/new">Thêm gói</Link>
        </Button>
      }
      isLoading={isLoading}
      error={error}
      onRetry={() => refetch()}
      empty={!data?.length}
      emptyTitle="Chưa có gói nào"
      emptyDescription="Tạo gói subscription hoặc top-up để brand có thể mua lượt thử AI."
    >
      {data && (
        <>
          <div className={portalCardListClass}>
            {data.map((plan) => (
              <article key={plan.id} className={portalCardClass}>
                <div className={portalCardRowClass}>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">
                      {plan.name}{" "}
                      <span className="text-muted-foreground">({plan.code})</span>
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatPrice(plan.priceVnd)} · {plan.quotaAmount} lượt · {plan.planType}
                    </p>
                    <Badge variant="outline" className="mt-2">
                      {plan.active ? "Đang bán" : "Tắt"}
                    </Badge>
                  </div>
                </div>
                <PortalActionGroup className={portalCardActionsClass}>
                  <PortalActionLink href={`/admin/billing/plans/${plan.id}/edit`} variant="edit">
                    Sửa
                  </PortalActionLink>
                  <PortalActionButton
                    variant="delete"
                    onClick={() => {
                      if (window.confirm(`Xóa gói "${plan.name}"?`)) {
                        remove.mutate(plan.id);
                      }
                    }}
                  >
                    Xóa
                  </PortalActionButton>
                </PortalActionGroup>
              </article>
            ))}
          </div>

          <PortalDataTable>
            <PortalDataTableHead>
              <tr>
                <th className={portalTableThClass}>Tên gói</th>
                <th className={portalTableThClass}>Mã</th>
                <th className={portalTableThClass}>Loại</th>
                <th className={portalTableThClass}>Giá</th>
                <th className={portalTableThClass}>Lượt</th>
                <th className={portalTableThClass}>Trạng thái</th>
                <th className={portalTableThClass}>Thao tác</th>
              </tr>
            </PortalDataTableHead>
            <PortalDataTableBody>
              {data.map((plan) => (
                <tr key={plan.id}>
                  <td className={portalTableTdClass}>{plan.name}</td>
                  <td className={portalTableTdClass}>{plan.code}</td>
                  <td className={portalTableTdClass}>{plan.planType}</td>
                  <td className={portalTableTdClass}>{formatPrice(plan.priceVnd)}</td>
                  <td className={portalTableTdClass}>{plan.quotaAmount}</td>
                  <td className={portalTableTdClass}>
                    <Badge variant="outline">{plan.active ? "Đang bán" : "Tắt"}</Badge>
                  </td>
                  <td className={portalTableTdClass}>
                    <PortalActionGroup className={portalTableActionsClass}>
                      <PortalActionLink href={`/admin/billing/plans/${plan.id}/edit`} variant="edit">
                        Sửa
                      </PortalActionLink>
                      <PortalActionButton
                        variant="delete"
                        onClick={() => {
                          if (window.confirm(`Xóa gói "${plan.name}"?`)) {
                            remove.mutate(plan.id);
                          }
                        }}
                      >
                        Xóa
                      </PortalActionButton>
                    </PortalActionGroup>
                  </td>
                </tr>
              ))}
            </PortalDataTableBody>
          </PortalDataTable>
        </>
      )}
    </PortalAdminPage>
  );
}
