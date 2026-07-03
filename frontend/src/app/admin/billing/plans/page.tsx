"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminBillingApi } from "@/services/billing-api";
import { PortalLayout, adminNav } from "@/components/layout/PortalLayout";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { formatPrice } from "@/utils/format-price";
import { portalCardClass, portalCardListClass } from "@/lib/design-tokens";
import type { BillingPlan, BillingPlanType } from "@/types/billing";
import { actionFeedback } from "@/lib/action-feedback";

const emptyForm = {
  code: "",
  name: "",
  planType: "SUBSCRIPTION" as BillingPlanType,
  priceVnd: 199000,
  quotaAmount: 1000,
  includesDashboard: true,
  billingPeriodDays: 30,
  active: true,
  sortOrder: 0,
};

export default function AdminBillingPlansPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-billing-plans"],
    queryFn: () => adminBillingApi.getPlans(),
  });

  const save = useMutation({
    mutationFn: () =>
      editingId
        ? adminBillingApi.updatePlan(editingId, form)
        : adminBillingApi.createPlan(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-billing-plans"] });
      setForm(emptyForm);
      setEditingId(null);
      actionFeedback({ successMessage: "Đã lưu gói" }).onSuccess();
    },
    onError: actionFeedback({ errorMessage: "Không thể lưu gói" }).onError,
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminBillingApi.deletePlan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-billing-plans"] });
      actionFeedback({ successMessage: "Đã xóa gói" }).onSuccess();
    },
    onError: actionFeedback({ errorMessage: "Không thể xóa gói" }).onError,
  });

  const startEdit = (plan: BillingPlan) => {
    setEditingId(plan.id);
    setForm({
      code: plan.code,
      name: plan.name,
      planType: plan.planType,
      priceVnd: plan.priceVnd,
      quotaAmount: plan.quotaAmount,
      includesDashboard: plan.includesDashboard,
      billingPeriodDays: plan.billingPeriodDays ?? undefined,
      active: plan.active,
      sortOrder: plan.sortOrder,
    });
  };

  return (
    <PortalLayout title="Admin" nav={adminNav}>
      <PortalPageHeader title="Gói brand" description="Quản lý gói subscription và top-up." />

      <div className={`${portalCardClass} mb-8 space-y-3`}>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <Input placeholder="Mã (SUB_STARTER)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          <Input placeholder="Tên gói" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input type="number" placeholder="Giá VNĐ" value={form.priceVnd} onChange={(e) => setForm({ ...form, priceVnd: Number(e.target.value) })} />
          <Input type="number" placeholder="Số lượt" value={form.quotaAmount} onChange={(e) => setForm({ ...form, quotaAmount: Number(e.target.value) })} />
        </div>
        <div className="flex flex-wrap gap-3">
          <select
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={form.planType}
            onChange={(e) => {
              const planType = e.target.value as BillingPlanType;
              setForm({
                ...form,
                planType,
                includesDashboard: planType === "SUBSCRIPTION",
                billingPeriodDays: planType === "SUBSCRIPTION" ? 30 : undefined,
              });
            }}
          >
            <option value="SUBSCRIPTION">Subscription</option>
            <option value="TOPUP">Top-up</option>
          </select>
          <Button onClick={() => save.mutate()} disabled={!form.code || !form.name}>
            {editingId ? "Cập nhật" : "Thêm gói"}
          </Button>
          {editingId && (
            <Button variant="outline" onClick={() => { setEditingId(null); setForm(emptyForm); }}>
              Hủy sửa
            </Button>
          )}
        </div>
      </div>

      {isLoading ? <LoadingSkeleton type="list" /> : (
        <div className={portalCardListClass}>
          {data?.map((plan) => (
            <article key={plan.id} className={portalCardClass}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">{plan.name} <span className="text-muted-foreground">({plan.code})</span></p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatPrice(plan.priceVnd)} · {plan.quotaAmount} lượt · {plan.planType}
                  </p>
                  <Badge variant="outline" className="mt-2">{plan.active ? "Đang bán" : "Tắt"}</Badge>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => startEdit(plan)}>Sửa</Button>
                  <Button variant="outline" size="sm" onClick={() => remove.mutate(plan.id)}>Xóa</Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </PortalLayout>
  );
}
