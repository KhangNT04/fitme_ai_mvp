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
      title="Gói người dùng (Pro)"
      description="Quản lý gói FitMe Pro: Fitken, voucher freeship và chu kỳ thanh toán cho người dùng."
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
      emptyDescription="Tạo gói Pro để người dùng đăng ký qua PayOS."
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
                      {formatPrice(plan.priceVnd)} · {plan.fitkenAmount} Fitken ·{" "}
                      {plan.freeshipVouchers} freeship · {plan.billingPeriodDays ?? 30} ngày
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
                <th className={portalTableThClass}>Giá</th>
                <th className={portalTableThClass}>Fitken</th>
                <th className={portalTableThClass}>Freeship</th>
                <th className={portalTableThClass}>Chu kỳ</th>
                <th className={portalTableThClass}>Trạng thái</th>
                <th className={portalTableThClass}>Thao tác</th>
              </tr>
            </PortalDataTableHead>
            <PortalDataTableBody>
              {data.map((plan) => (
                <tr key={plan.id}>
                  <td className={portalTableTdClass}>{plan.name}</td>
                  <td className={portalTableTdClass}>{plan.code}</td>
                  <td className={portalTableTdClass}>{formatPrice(plan.priceVnd)}</td>
                  <td className={portalTableTdClass}>{plan.fitkenAmount}</td>
                  <td className={portalTableTdClass}>
                    {plan.freeshipVouchers} × {formatPrice(plan.freeshipMaxDiscountVnd)}
                  </td>
                  <td className={portalTableTdClass}>{plan.billingPeriodDays ?? 30} ngày</td>
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
