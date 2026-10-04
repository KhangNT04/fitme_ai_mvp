"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PortalFormCard } from "@/components/portal/PortalFormCard";
import type { PayoutAccount } from "@/types/commerce";

interface PayoutAccountFormProps {
  initial?: PayoutAccount | null;
  saving?: boolean;
  onSubmit: (value: Required<PayoutAccount>) => void;
}

export function validatePayoutAccount(value: PayoutAccount): string | null {
  if (!value.bankName?.trim()) return "Vui lòng nhập tên ngân hàng";
  const number = value.bankAccountNumber?.replace(/\s/g, "") ?? "";
  if (!number) return "Vui lòng nhập số tài khoản";
  if (!/^\d{6,20}$/.test(number)) return "Số tài khoản chỉ gồm 6–20 chữ số";
  if (!value.bankAccountName?.trim()) return "Vui lòng nhập tên chủ tài khoản";
  return null;
}

export function PayoutAccountForm({ initial, saving, onSubmit }: PayoutAccountFormProps) {
  const [bankName, setBankName] = useState(initial?.bankName ?? "");
  const [bankAccountNumber, setBankAccountNumber] = useState(initial?.bankAccountNumber ?? "");
  const [bankAccountName, setBankAccountName] = useState(initial?.bankAccountName ?? "");
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = {
      bankName: bankName.trim(),
      bankAccountNumber: bankAccountNumber.replace(/\s/g, ""),
      bankAccountName: bankAccountName.trim().toUpperCase(),
    };
    const message = validatePayoutAccount(value);
    setError(message);
    if (message) return;
    onSubmit(value);
  };

  return (
    <form onSubmit={submit} noValidate>
      <PortalFormCard>
        <div>
          <h2 className="text-base font-semibold">Tài khoản nhận tiền</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            FitMe sẽ chuyển khoản tiền hàng (sau khi trừ hoa hồng) vào tài khoản này khi đối soát.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <Label htmlFor="bank-name">Ngân hàng</Label>
            <Input
              id="bank-name"
              className="mt-1"
              value={bankName}
              placeholder="Vietcombank"
              onChange={(e) => setBankName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="bank-number">Số tài khoản</Label>
            <Input
              id="bank-number"
              className="mt-1"
              inputMode="numeric"
              value={bankAccountNumber}
              placeholder="0123456789"
              onChange={(e) => setBankAccountNumber(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="bank-holder">Chủ tài khoản</Label>
            <Input
              id="bank-holder"
              className="mt-1"
              value={bankAccountName}
              placeholder="NGUYEN VAN A"
              onChange={(e) => setBankAccountName(e.target.value)}
            />
          </div>
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        <Button type="submit" disabled={saving}>
          {saving ? "Đang lưu..." : "Lưu tài khoản"}
        </Button>
      </PortalFormCard>
    </form>
  );
}
