"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminBillingApi } from "@/services/billing-api";
import { PortalAdminPage } from "@/components/portal/PortalAdminPage";
import {
  PortalActionButton,
  PortalActionGroup,
} from "@/components/portal/PortalActionButton";
import {
  BillingPlanForm,
  emptyBillingPlanForm,
  formValuesToWrite,
  planToFormValues,
} from "@/components/admin/BillingPlanForm";
import { actionFeedback } from "@/lib/action-feedback";

export default function AdminBillingPlanEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyBillingPlanForm());

  const planQuery = useQuery({
    queryKey: ["admin-billing-plan", id],
    queryFn: () => adminBillingApi.getPlan(id),
  });

  useEffect(() => {
    if (planQuery.data) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate editable form from fetched plan
      setForm(planToFormValues(planQuery.data));
    }
  }, [planQuery.data]);

  const listHref = `/admin/billing/plans?tab=${planQuery.data?.audience === "BRAND" ? "brand" : "consumer"}`;

  const save = useMutation({
    mutationFn: () => adminBillingApi.updatePlan(id, formValuesToWrite(form)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-billing-plans"] });
      queryClient.invalidateQueries({ queryKey: ["admin-billing-plan", id] });
      actionFeedback({ successMessage: "Đã cập nhật gói" }).onSuccess();
      router.push(listHref);
    },
    onError: actionFeedback({ errorMessage: "Không thể cập nhật gói" }).onError,
  });

  const remove = useMutation({
    mutationFn: () => adminBillingApi.deletePlan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-billing-plans"] });
      actionFeedback({ successMessage: "Đã xóa gói" }).onSuccess();
      router.push(listHref);
    },
    onError: actionFeedback({ errorMessage: "Không thể xóa gói" }).onError,
  });

  const planName = planQuery.data?.name ?? "Gói";

  return (
    <PortalAdminPage
      title={`Chỉnh sửa: ${planName}`}
      description={
        planQuery.data?.audience === "BRAND"
          ? "Cập nhật giá, chu kỳ và giảm giá của gói brand."
          : "Cập nhật gói người dùng (Fitken, chu kỳ)."
      }
      backHref={listHref}
      backLabel="Gói dịch vụ"
      isLoading={planQuery.isLoading}
      error={planQuery.error}
      onRetry={() => planQuery.refetch()}
      skeleton="detail"
    >
      {planQuery.data && (
        <>
          <BillingPlanForm
            form={form}
            setForm={setForm}
            loading={save.isPending}
            submitLabel="Lưu thay đổi"
            onSubmit={() => save.mutate()}
          />

          <PortalActionGroup className="mt-6">
            <PortalActionButton
              variant="delete"
              loading={remove.isPending}
              disabled={save.isPending}
              onClick={() => {
                if (window.confirm(`Xóa gói "${planQuery.data.name}"?`)) {
                  remove.mutate();
                }
              }}
            >
              Xóa gói
            </PortalActionButton>
          </PortalActionGroup>
        </>
      )}
    </PortalAdminPage>
  );
}
