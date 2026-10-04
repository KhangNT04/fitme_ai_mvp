"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { portalFormCardClass } from "@/lib/design-tokens";
import type { BillingPlan, BillingPlanType, BillingPlanWrite } from "@/types/billing";

export type BillingPlanFormValues = BillingPlanWrite;

export function emptyBillingPlanForm(): BillingPlanFormValues {
  return {
    code: "",
    name: "",
    planType: "SUBSCRIPTION",
    priceVnd: 49000,
    fitkenAmount: 15,
    freeshipVouchers: 2,
    freeshipMaxDiscountVnd: 30000,
    billingPeriodDays: 30,
    active: true,
    sortOrder: 0,
  };
}

export function planToFormValues(plan: BillingPlan): BillingPlanFormValues {
  return {
    code: plan.code,
    name: plan.name,
    planType: plan.planType ?? "SUBSCRIPTION",
    priceVnd: plan.priceVnd,
    fitkenAmount: plan.fitkenAmount,
    freeshipVouchers: plan.freeshipVouchers,
    freeshipMaxDiscountVnd: plan.freeshipMaxDiscountVnd,
    billingPeriodDays: plan.planType === "TOPUP" ? null : (plan.billingPeriodDays ?? 30),
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
  const isTopup = form.planType === "TOPUP";
  return (
    <form
      className={portalFormCardClass}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="plan-type">Loại gói</Label>
          <select
            id="plan-type"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={form.planType ?? "SUBSCRIPTION"}
            onChange={(e) => {
              const planType = e.target.value as BillingPlanType;
              setForm(
                planType === "TOPUP"
                  ? { ...form, planType, freeshipVouchers: 0, billingPeriodDays: null }
                  : { ...form, planType, billingPeriodDays: form.billingPeriodDays ?? 30 },
              );
            }}
          >
            <option value="SUBSCRIPTION">Gói tháng (Pro)</option>
            <option value="TOPUP">Gói mua thêm Fitken (top-up, dùng một lần)</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="plan-code">Mã gói</Label>
          <Input
            id="plan-code"
            placeholder="PRO_MONTHLY"
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
            placeholder="FitMe Pro"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
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
          <Label htmlFor="plan-fitken">{isTopup ? "Số Fitken cộng vào ví" : "Số Fitken / chu kỳ"}</Label>
          <Input
            id="plan-fitken"
            type="number"
            min={1}
            value={form.fitkenAmount}
            onChange={(e) => setForm({ ...form, fitkenAmount: Number(e.target.value) })}
          />
        </div>
        {!isTopup && (
          <>
            <div className="space-y-2">
              <Label htmlFor="plan-freeship-count">Voucher freeship / chu kỳ</Label>
              <Input
                id="plan-freeship-count"
                type="number"
                min={0}
                value={form.freeshipVouchers}
                onChange={(e) => setForm({ ...form, freeshipVouchers: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-freeship-max">Giảm tối đa freeship (VNĐ)</Label>
              <Input
                id="plan-freeship-max"
                type="number"
                min={0}
                value={form.freeshipMaxDiscountVnd}
                onChange={(e) =>
                  setForm({ ...form, freeshipMaxDiscountVnd: Number(e.target.value) })
                }
              />
            </div>
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
          </>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={form.active}
          onCheckedChange={(checked) => setForm({ ...form, active: checked === true })}
        />
        Đang bán
      </label>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={loading || !form.code || !form.name}>
          {loading ? "Đang lưu..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
