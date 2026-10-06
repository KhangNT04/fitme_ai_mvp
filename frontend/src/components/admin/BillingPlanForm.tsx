"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { portalFormCardClass } from "@/lib/design-tokens";
import {
  effectivePrice,
  formatDiscountWindow,
  fromDateTimeLocalValue,
  isDiscountActive,
  toDateTimeLocalValue,
} from "@/lib/plan-pricing";
import { formatPrice } from "@/utils/format-price";
import { billingPlanFormSchema, type BillingPlanFormValues } from "@/utils/validators";
import type { BillingPlan, BillingPlanType, BillingPlanWrite, PlanAudience } from "@/types/billing";

export type { BillingPlanFormValues };

export function emptyBillingPlanForm(audience: PlanAudience = "CONSUMER"): BillingPlanFormValues {
  const brand = audience === "BRAND";
  return {
    code: "",
    name: "",
    audience,
    planType: "SUBSCRIPTION",
    priceVnd: brand ? 999000 : 49000,
    fitkenAmount: brand ? 0 : 15,
    billingPeriodDays: 30,
    active: true,
    sortOrder: 0,
    discountPercent: null,
    discountStartsLocal: "",
    discountEndsLocal: "",
  };
}

export function planToFormValues(plan: BillingPlan): BillingPlanFormValues {
  return {
    code: plan.code,
    name: plan.name,
    audience: plan.audience ?? "CONSUMER",
    planType: plan.planType ?? "SUBSCRIPTION",
    priceVnd: plan.priceVnd,
    fitkenAmount: plan.fitkenAmount,
    billingPeriodDays: plan.planType === "TOPUP" ? null : (plan.billingPeriodDays ?? 30),
    active: plan.active,
    sortOrder: plan.sortOrder,
    discountPercent: plan.discountPercent ?? null,
    discountStartsLocal: toDateTimeLocalValue(plan.discountStartsAt),
    discountEndsLocal: toDateTimeLocalValue(plan.discountEndsAt),
  };
}

/** Request body; consumer plans never carry a discount (backend rejects it). */
export function formValuesToWrite(form: BillingPlanFormValues): BillingPlanWrite {
  const brand = form.audience === "BRAND";
  return {
    code: form.code.trim(),
    name: form.name.trim(),
    audience: form.audience,
    planType: form.planType,
    priceVnd: form.priceVnd,
    fitkenAmount: brand ? 0 : form.fitkenAmount,
    billingPeriodDays: form.planType === "TOPUP" ? null : form.billingPeriodDays,
    active: form.active,
    sortOrder: form.sortOrder,
    discountPercent: brand ? form.discountPercent : null,
    discountStartsAt: brand ? fromDateTimeLocalValue(form.discountStartsLocal) : null,
    discountEndsAt: brand ? fromDateTimeLocalValue(form.discountEndsLocal) : null,
  };
}

type FormErrors = Partial<Record<keyof BillingPlanFormValues, string>>;

interface BillingPlanFormProps {
  form: BillingPlanFormValues;
  setForm: (form: BillingPlanFormValues) => void;
  onSubmit: () => void;
  loading?: boolean;
  submitLabel?: string;
  codeReadOnly?: boolean;
  /** Audience can only be chosen when creating a plan. */
  audienceEditable?: boolean;
}

const selectClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

export function BillingPlanForm({
  form,
  setForm,
  onSubmit,
  loading,
  submitLabel = "Lưu",
  codeReadOnly,
  audienceEditable,
}: BillingPlanFormProps) {
  const [errors, setErrors] = useState<FormErrors>({});
  const isTopup = form.planType === "TOPUP";
  const isBrand = form.audience === "BRAND";

  const update = (patch: Partial<BillingPlanFormValues>) => {
    setForm({ ...form, ...patch });
    const cleared = { ...errors };
    for (const key of Object.keys(patch) as (keyof BillingPlanFormValues)[]) delete cleared[key];
    setErrors(cleared);
  };

  const preview = formValuesToWrite(form);
  const previewInput = {
    priceVnd: form.priceVnd,
    discountPercent: preview.discountPercent,
    discountStartsAt: preview.discountStartsAt,
    discountEndsAt: preview.discountEndsAt,
  };
  const previewActive = isBrand && isDiscountActive(previewInput);
  const previewWindow = formatDiscountWindow(preview.discountStartsAt, preview.discountEndsAt);

  const submit = () => {
    const result = billingPlanFormSchema.safeParse(form);
    if (!result.success) {
      const next: FormErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof BillingPlanFormValues | undefined;
        if (key && !next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    onSubmit();
  };

  return (
    <form
      className={portalFormCardClass}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="plan-audience">Đối tượng</Label>
          {audienceEditable ? (
            <select
              id="plan-audience"
              className={selectClass}
              value={form.audience}
              onChange={(e) => {
                const audience = e.target.value as PlanAudience;
                update(
                  audience === "BRAND"
                    ? { audience, planType: "SUBSCRIPTION", fitkenAmount: 0, billingPeriodDays: form.billingPeriodDays ?? 30 }
                    : { audience, fitkenAmount: form.fitkenAmount || 15, discountPercent: null, discountStartsLocal: "", discountEndsLocal: "" },
                );
              }}
            >
              <option value="CONSUMER">Người dùng (Premium, top-up Fitken)</option>
              <option value="BRAND">Brand (gói Plus)</option>
            </select>
          ) : (
            <p id="plan-audience" className="flex h-10 items-center text-sm text-muted-foreground">
              {isBrand ? "Brand (gói Plus)" : "Người dùng"} — không thể đổi sau khi tạo
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="plan-type">Loại gói</Label>
          <select
            id="plan-type"
            className={selectClass}
            value={form.planType}
            disabled={isBrand}
            onChange={(e) => {
              const planType = e.target.value as BillingPlanType;
              update(
                planType === "TOPUP"
                  ? { planType, billingPeriodDays: null }
                  : { planType, billingPeriodDays: form.billingPeriodDays ?? 30 },
              );
            }}
          >
            <option value="SUBSCRIPTION">{isBrand ? "Gói theo chu kỳ" : "Gói tháng (Premium)"}</option>
            {!isBrand && <option value="TOPUP">Gói mua thêm Fitken (top-up, dùng một lần)</option>}
          </select>
          <FieldError message={errors.planType} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="plan-code">Mã gói</Label>
          <Input
            id="plan-code"
            placeholder={isBrand ? "BRAND_PLUS" : "PREMIUM_MONTHLY"}
            value={form.code}
            readOnly={codeReadOnly}
            disabled={codeReadOnly}
            aria-invalid={errors.code ? true : undefined}
            onChange={(e) => update({ code: e.target.value })}
          />
          <FieldError message={errors.code} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="plan-name">Tên gói</Label>
          <Input
            id="plan-name"
            placeholder={isBrand ? "FitMe Brand Plus" : "FitMe Premium"}
            value={form.name}
            aria-invalid={errors.name ? true : undefined}
            onChange={(e) => update({ name: e.target.value })}
          />
          <FieldError message={errors.name} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="plan-sort">Thứ tự hiển thị</Label>
          <Input
            id="plan-sort"
            type="number"
            value={form.sortOrder}
            onChange={(e) => update({ sortOrder: Number(e.target.value) })}
          />
          <FieldError message={errors.sortOrder} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="plan-price">Giá niêm yết (VNĐ)</Label>
          <Input
            id="plan-price"
            type="number"
            min={1}
            value={form.priceVnd}
            aria-invalid={errors.priceVnd ? true : undefined}
            onChange={(e) => update({ priceVnd: Number(e.target.value) })}
          />
          <FieldError message={errors.priceVnd} />
        </div>
        {!isBrand && (
          <div className="space-y-2">
            <Label htmlFor="plan-fitken">{isTopup ? "Số Fitken cộng vào ví" : "Số Fitken / chu kỳ"}</Label>
            <Input
              id="plan-fitken"
              type="number"
              min={1}
              value={form.fitkenAmount}
              aria-invalid={errors.fitkenAmount ? true : undefined}
              onChange={(e) => update({ fitkenAmount: Number(e.target.value) })}
            />
            <FieldError message={errors.fitkenAmount} />
          </div>
        )}
        {!isTopup && (
          <div className="space-y-2">
            <Label htmlFor="plan-period">Chu kỳ (ngày)</Label>
            <Input
              id="plan-period"
              type="number"
              min={1}
              value={form.billingPeriodDays ?? 30}
              aria-invalid={errors.billingPeriodDays ? true : undefined}
              onChange={(e) => update({ billingPeriodDays: Number(e.target.value) })}
            />
            <FieldError message={errors.billingPeriodDays} />
          </div>
        )}
      </div>

      {isBrand && (
        <fieldset className="space-y-4 rounded-xl border border-border/60 p-4">
          <legend className="px-1 text-sm font-semibold">Giảm giá</legend>
          <p className="text-xs text-muted-foreground">
            Để trống phần trăm (hoặc 0) để tắt giảm giá. Bỏ trống ngày bắt đầu / kết thúc nghĩa là không giới hạn.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="plan-discount-percent">Phần trăm giảm (%)</Label>
              <Input
                id="plan-discount-percent"
                type="number"
                min={0}
                max={100}
                step={1}
                value={form.discountPercent ?? ""}
                aria-invalid={errors.discountPercent ? true : undefined}
                onChange={(e) =>
                  update({ discountPercent: e.target.value === "" ? null : Number(e.target.value) })
                }
              />
              <FieldError message={errors.discountPercent} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-discount-starts">Bắt đầu</Label>
              <Input
                id="plan-discount-starts"
                type="datetime-local"
                value={form.discountStartsLocal}
                onChange={(e) => update({ discountStartsLocal: e.target.value })}
              />
              <FieldError message={errors.discountStartsLocal} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-discount-ends">Kết thúc</Label>
              <Input
                id="plan-discount-ends"
                type="datetime-local"
                value={form.discountEndsLocal}
                aria-invalid={errors.discountEndsLocal ? true : undefined}
                onChange={(e) => update({ discountEndsLocal: e.target.value })}
              />
              <FieldError message={errors.discountEndsLocal} />
            </div>
          </div>
          <p className="text-sm">
            Giá áp dụng ngay lúc này:{" "}
            <span className="font-semibold">{formatPrice(effectivePrice(previewInput))}</span>
            {previewActive
              ? ` (giảm ${form.discountPercent}%${previewWindow ? `, ${previewWindow}` : ""})`
              : (form.discountPercent ?? 0) > 0
                ? ` — giảm ${form.discountPercent}% chưa áp dụng${previewWindow ? ` (${previewWindow})` : ""}`
                : ""}
          </p>
        </fieldset>
      )}

      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={form.active}
          onCheckedChange={(checked) => update({ active: checked === true })}
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
