"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { adminBillingApi } from "@/services/billing-api";
import { PortalAdminPage } from "@/components/portal/PortalAdminPage";
import {
  BillingPlanForm,
  emptyBillingPlanForm,
} from "@/components/admin/BillingPlanForm";
import { actionFeedback } from "@/lib/action-feedback";

export default function AdminBillingPlanNewPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyBillingPlanForm());

  const create = useMutation({
    mutationFn: () => adminBillingApi.createPlan(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-billing-plans"] });
      actionFeedback({ successMessage: "Đã thêm gói" }).onSuccess();
      router.push("/admin/billing/plans");
    },
    onError: actionFeedback({ errorMessage: "Không thể thêm gói" }).onError,
  });

  return (
    <PortalAdminPage
      title="Thêm gói mới"
      description="Tạo gói subscription hoặc top-up mới trong danh mục."
      backHref="/admin/billing/plans"
      backLabel="Danh mục gói"
    >
      <BillingPlanForm
        form={form}
        setForm={setForm}
        loading={create.isPending}
        submitLabel="Thêm gói"
        onSubmit={() => create.mutate()}
      />
    </PortalAdminPage>
  );
}
