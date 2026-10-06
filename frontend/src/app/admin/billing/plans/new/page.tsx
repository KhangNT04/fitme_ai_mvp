"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { adminBillingApi } from "@/services/billing-api";
import { PortalAdminPage } from "@/components/portal/PortalAdminPage";
import { PageSuspense } from "@/components/common/PageSuspense";
import {
  BillingPlanForm,
  emptyBillingPlanForm,
  formValuesToWrite,
} from "@/components/admin/BillingPlanForm";
import { actionFeedback } from "@/lib/action-feedback";

export default function AdminBillingPlanNewPage() {
  return (
    <PageSuspense>
      <AdminBillingPlanNewContent />
    </PageSuspense>
  );
}

function AdminBillingPlanNewContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const initialAudience = searchParams.get("audience") === "BRAND" ? "BRAND" : "CONSUMER";
  const [form, setForm] = useState(() => emptyBillingPlanForm(initialAudience));
  const listHref = `/admin/billing/plans?tab=${form.audience === "BRAND" ? "brand" : "consumer"}`;

  const create = useMutation({
    mutationFn: () => adminBillingApi.createPlan(formValuesToWrite(form)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-billing-plans"] });
      actionFeedback({ successMessage: "Đã thêm gói" }).onSuccess();
      router.push(listHref);
    },
    onError: actionFeedback({ errorMessage: "Không thể thêm gói" }).onError,
  });

  return (
    <PortalAdminPage
      title="Thêm gói dịch vụ"
      description="Tạo gói cho người dùng (Premium, top-up Fitken) hoặc gói trả phí cho brand."
      backHref={listHref}
      backLabel="Gói dịch vụ"
    >
      <BillingPlanForm
        form={form}
        setForm={setForm}
        loading={create.isPending}
        submitLabel="Thêm gói"
        audienceEditable
        onSubmit={() => create.mutate()}
      />
    </PortalAdminPage>
  );
}
