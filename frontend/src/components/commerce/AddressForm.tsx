"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { emptyAddressInput, validateAddressInput } from "@/lib/commerce-utils";
import type { AddressInput } from "@/types/commerce";

interface AddressFormProps {
  initial?: Partial<AddressInput>;
  submitLabel?: string;
  submitting?: boolean;
  /** Hide the "set as default" checkbox (e.g. first address is always default). */
  hideDefault?: boolean;
  onSubmit: (input: AddressInput) => void;
  onCancel?: () => void;
  idPrefix?: string;
}

export function AddressForm({
  initial,
  submitLabel = "Lưu địa chỉ",
  submitting,
  hideDefault,
  onSubmit,
  onCancel,
  idPrefix = "addr",
}: AddressFormProps) {
  const [values, setValues] = useState<AddressInput>({ ...emptyAddressInput(), ...initial });
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof AddressInput>(key: K, value: AddressInput[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const message = validateAddressInput(values);
    setError(message);
    if (message) return;
    onSubmit({
      ...values,
      recipientName: values.recipientName.trim(),
      phone: values.phone.trim(),
      province: values.province.trim(),
      district: values.district.trim(),
      ward: values.ward.trim(),
      street: values.street.trim(),
    });
  };

  const field = (
    key: "recipientName" | "phone" | "province" | "district" | "ward" | "street",
    label: string,
    placeholder: string,
    extra?: { type?: string; autoComplete?: string; className?: string },
  ) => (
    <div className={extra?.className}>
      <Label htmlFor={`${idPrefix}-${key}`}>{label}</Label>
      <Input
        id={`${idPrefix}-${key}`}
        className="mt-1"
        value={values[key]}
        placeholder={placeholder}
        type={extra?.type}
        autoComplete={extra?.autoComplete}
        onChange={(e) => set(key, e.target.value)}
      />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        {field("recipientName", "Người nhận", "Nguyễn Văn A", { autoComplete: "name" })}
        {field("phone", "Số điện thoại", "0901234567", { type: "tel", autoComplete: "tel" })}
        {field("province", "Tỉnh / Thành phố", "TP. Hồ Chí Minh")}
        {field("district", "Quận / Huyện", "Quận 1")}
        {field("ward", "Phường / Xã", "Phường Bến Nghé")}
        {field("street", "Số nhà, tên đường", "12 Nguyễn Huệ")}
      </div>

      {!hideDefault && (
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={values.isDefault}
            onChange={(e) => set("isDefault", e.target.checked)}
            className="h-4 w-4 rounded border-border accent-[var(--primary)]"
          />
          Đặt làm địa chỉ mặc định
        </label>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Đang lưu..." : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
            Hủy
          </Button>
        )}
      </div>
    </form>
  );
}
