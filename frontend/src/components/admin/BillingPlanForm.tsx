"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { portalFormCardClass } from "@/lib/design-tokens";
import type { BillingPlan, BillingPlanType } from "@/types/billing";

export type BillingPlanFormValues = Omit<BillingPlan, "id">;

export function emptyBillingPlanForm(): BillingPlanFormValues {
  return {
    code: "",
    name: "",
    planType: "SUBSCRIPTION",
    priceVnd: 199000,
    quotaAmount: 1000,
    includesDashboard: true,
    billingPeriodDays: 30,
    active: true,
    sortOrder: 0,
  };
}

export function planToFormValues(plan: BillingPlan): BillingPlanFormValues {
  return {
    code: plan.code,
    name: plan.name,
    planType: plan.planType,
    priceVnd: plan.priceVnd,
    quotaAmount: plan.quotaAmount,
    includesDashboard: plan.includesDashboard,
    billingPeriodDays: plan.billingPeriodDays ?? (plan.planType === "SUBSCRIPTION" ? 30 : 0),
    active: plan.active,
    sortOrder: plan.sortOrder,
  };
}

interface BillingPlanFormProps {
  form: BillingPlanFormValues;
  setForm: (form: BillingPlanFormValues) => void;
  onSubmit: () => void;
  loading?: boolean;
  submitLabel?: string;
  codeReadOnly?: boolean;
}

export function BillingPlanForm({
  form,
  setForm,
  onSubmit,
  loading,
  submitLabel = "Lưu",
  codeReadOnly,
}: BillingPlanFormProps) {
  const isSubscription = form.planType === "SUBSCRIPTION";

  const setPlanType = (planType: BillingPlanType) => {
    setForm({
      ...form,
      planType,
      includesDashboard: planType === "SUBSCRIPTION",
      billingPeriodDays: planType === "SUBSCRIPTION" ? 30 : 0,
    });
  };

  return (
    <form
      className={portalFormCardClass}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="plan-code">Mã gói</Label>
          <Input
            id="plan-code"
            placeholder="SUB_STARTER"
            value={form.code}
            readOnly={codeReadOnly}
            disabled={codeReadOnly}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="plan-name">Tên gói</Label>
          <Input
            id="plan-name"
            placeholder="Starter"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="plan-type">Loại gói</Label>
          <select
            id="plan-type"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={form.planType}
            onChange={(e) => setPlanType(e.target.value as BillingPlanType)}
          >
            <option value="SUBSCRIPTION">Subscription (gói tháng)</option>
            <option value="TOPUP">Top-up (mua thêm lượt)</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="plan-sort">Thứ tự hiển thị</Label>
          <Input
            id="plan-sort"
            type="number"
            value={form.sortOrder}
            onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="plan-price">Giá (VNĐ)</Label>
          <Input
            id="plan-price"
            type="number"
            min={1}
            value={form.priceVnd}
            onChange={(e) => setForm({ ...form, priceVnd: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="plan-quota">Số lượt thử AI</Label>
          <Input
            id="plan-quota"
            type="number"
            min={1}
            value={form.quotaAmount}
            onChange={(e) => setForm({ ...form, quotaAmount: Number(e.target.value) })}
          />
        </div>
        {isSubscription && (
          <div className="space-y-2">
            <Label htmlFor="plan-period">Chu kỳ (ngày)</Label>
            <Input
              id="plan-period"
              type="number"
              min={1}
              value={form.billingPeriodDays ?? 30}
              onChange={(e) =>
                setForm({ ...form, billingPeriodDays: Number(e.target.value) })
              }
            />
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={form.active}
            onCheckedChange={(checked) => setForm({ ...form, active: checked === true })}
          />
          Đang bán
        </label>
        {isSubscription && (
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox checked={form.includesDashboard} disabled />
            Bao gồm dashboard phân tích
          </label>
        )}
        {!isSubscription && (
          <p className="text-sm text-muted-foreground">Gói top-up không bao gồm dashboard.</p>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={loading || !form.code || !form.name}>
          {loading ? "Đang lưu..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
