"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { portalFormCardClass } from "@/lib/design-tokens";
import { fromDateTimeLocalValue, toDateTimeLocalValue } from "@/lib/plan-pricing";
import { voucherCampaignFormSchema, type VoucherCampaignFormValues } from "@/utils/validators";
import type { VoucherCampaign, VoucherCampaignWrite } from "@/types/billing";

export type { VoucherCampaignFormValues };

export function emptyVoucherCampaignForm(): VoucherCampaignFormValues {
  return {
    name: "",
    description: "",
    discountPercent: 50,
    vouchersPerBrand: 1,
    maxBrands: 5,
    validFromLocal: "",
    validUntilLocal: "",
    active: true,
  };
}

export function campaignToFormValues(campaign: VoucherCampaign): VoucherCampaignFormValues {
  return {
    name: campaign.name,
    description: campaign.description ?? "",
    discountPercent: campaign.discountPercent,
    vouchersPerBrand: campaign.vouchersPerBrand,
    maxBrands: campaign.maxBrands,
    validFromLocal: toDateTimeLocalValue(campaign.validFrom),
    validUntilLocal: toDateTimeLocalValue(campaign.validUntil),
    active: campaign.active,
  };
}

export function campaignFormValuesToWrite(form: VoucherCampaignFormValues): VoucherCampaignWrite {
  return {
    name: form.name.trim(),
    description: form.description.trim() || null,
    discountPercent: form.discountPercent,
    vouchersPerBrand: form.vouchersPerBrand,
    maxBrands: form.maxBrands,
    validFrom: fromDateTimeLocalValue(form.validFromLocal),
    validUntil: fromDateTimeLocalValue(form.validUntilLocal),
    active: form.active,
  };
}

type FormErrors = Partial<Record<keyof VoucherCampaignFormValues, string>>;

interface VoucherCampaignFormProps {
  form: VoucherCampaignFormValues;
  setForm: (form: VoucherCampaignFormValues) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  loading?: boolean;
  submitLabel?: string;
  /** Editing a campaign that already issued vouchers. */
  editing?: boolean;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

export function VoucherCampaignForm({
  form,
  setForm,
  onSubmit,
  onCancel,
  loading,
  submitLabel = "Lưu",
  editing,
}: VoucherCampaignFormProps) {
  const [errors, setErrors] = useState<FormErrors>({});

  const update = (patch: Partial<VoucherCampaignFormValues>) => {
    setForm({ ...form, ...patch });
    const cleared = { ...errors };
    for (const key of Object.keys(patch) as (keyof VoucherCampaignFormValues)[]) delete cleared[key];
    setErrors(cleared);
  };

  const submit = () => {
    const result = voucherCampaignFormSchema.safeParse(form);
    if (!result.success) {
      const next: FormErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof VoucherCampaignFormValues | undefined;
        if (key && !next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    onSubmit();
  };

  const numberValue = (value: string) => (value === "" ? Number.NaN : Number(value));

  return (
    <form
      className={portalFormCardClass}
      noValidate
      aria-label="Chiến dịch voucher"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="campaign-name">Tên chiến dịch</Label>
          <Input
            id="campaign-name"
            placeholder="Brand tiên phong"
            value={form.name}
            aria-invalid={errors.name ? true : undefined}
            onChange={(e) => update({ name: e.target.value })}
          />
          <FieldError message={errors.name} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="campaign-description">Mô tả</Label>
          <Input
            id="campaign-description"
            placeholder="Ưu đãi cho brand tiên phong"
            value={form.description}
            aria-invalid={errors.description ? true : undefined}
            onChange={(e) => update({ description: e.target.value })}
          />
          <FieldError message={errors.description} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="campaign-percent">Phần trăm giảm (%)</Label>
          <Input
            id="campaign-percent"
            type="number"
            min={1}
            max={99}
            step={1}
            value={Number.isNaN(form.discountPercent) ? "" : form.discountPercent}
            aria-invalid={errors.discountPercent ? true : undefined}
            onChange={(e) => update({ discountPercent: numberValue(e.target.value) })}
          />
          <FieldError message={errors.discountPercent} />
          {editing && (
            <p className="text-xs text-muted-foreground">
              Voucher đã phát giữ nguyên mức giảm cũ; mức mới chỉ áp dụng cho voucher phát sau.
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="campaign-per-brand">Số voucher mỗi brand</Label>
          <Input
            id="campaign-per-brand"
            type="number"
            min={1}
            max={100}
            step={1}
            value={Number.isNaN(form.vouchersPerBrand) ? "" : form.vouchersPerBrand}
            aria-invalid={errors.vouchersPerBrand ? true : undefined}
            onChange={(e) => update({ vouchersPerBrand: numberValue(e.target.value) })}
          />
          <FieldError message={errors.vouchersPerBrand} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="campaign-max-brands">Số brand tối đa</Label>
          <Input
            id="campaign-max-brands"
            type="number"
            min={1}
            step={1}
            value={Number.isNaN(form.maxBrands) ? "" : form.maxBrands}
            aria-invalid={errors.maxBrands ? true : undefined}
            onChange={(e) => update({ maxBrands: numberValue(e.target.value) })}
          />
          <FieldError message={errors.maxBrands} />
        </div>
      </div>

      <fieldset className="space-y-4 rounded-xl border border-border/60 p-4">
        <legend className="px-1 text-sm font-semibold">Thời gian</legend>
        <p className="text-xs text-muted-foreground">
          Chỉ phát voucher trong khoảng thời gian này. Voucher hết hạn vào thời điểm kết thúc. Bỏ trống nghĩa là không
          giới hạn.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="campaign-valid-from">Bắt đầu</Label>
            <Input
              id="campaign-valid-from"
              type="datetime-local"
              value={form.validFromLocal}
              onChange={(e) => update({ validFromLocal: e.target.value })}
            />
            <FieldError message={errors.validFromLocal} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="campaign-valid-until">Kết thúc</Label>
            <Input
              id="campaign-valid-until"
              type="datetime-local"
              value={form.validUntilLocal}
              aria-invalid={errors.validUntilLocal ? true : undefined}
              onChange={(e) => update({ validUntilLocal: e.target.value })}
            />
            <FieldError message={errors.validUntilLocal} />
            {editing && (
              <p className="text-xs text-muted-foreground">Voucher đã phát giữ nguyên hạn dùng cũ.</p>
            )}
          </div>
        </div>
      </fieldset>

      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={form.active} onCheckedChange={(checked) => update({ active: checked === true })} />
        Đang hoạt động
      </label>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={loading || !form.name.trim()}>
          {loading ? "Đang lưu..." : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" disabled={loading} onClick={onCancel}>
            Hủy
          </Button>
        )}
      </div>
    </form>
  );
}
