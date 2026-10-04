"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { CollapsingPageHeader } from "@/components/layout/CollapsingPageHeader";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { ErrorState } from "@/components/common/ErrorState";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { PageSuspense } from "@/components/common/PageSuspense";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AddressForm } from "@/components/commerce/AddressForm";
import { LoginRequiredNotice } from "@/components/commerce/LoginRequiredNotice";
import { useRequireLogin } from "@/hooks/use-require-login";
import { formatAddressLine } from "@/lib/commerce-utils";
import { getCommerceErrorMessage } from "@/lib/commerce-errors";
import { consumerPageShellClass } from "@/lib/design-tokens";
import { addressApi, ADDRESSES_QUERY_KEY } from "@/services/address-api";
import { toast } from "@/stores/toast-store";
import type { Address, AddressInput } from "@/types/commerce";

export default function AddressesPage() {
  return (
    <PageSuspense>
      <AddressesContent />
    </PageSuspense>
  );
}

type Editing = { mode: "new" } | { mode: "edit"; address: Address } | null;

function toInput(a: Address): AddressInput {
  return {
    recipientName: a.recipientName,
    phone: a.phone,
    province: a.province,
    district: a.district,
    ward: a.ward,
    street: a.street,
    isDefault: a.isDefault,
  };
}

function AddressesContent() {
  const queryClient = useQueryClient();
  const { ready, authed } = useRequireLogin();
  const [editing, setEditing] = useState<Editing>(null);
  const [deleteTarget, setDeleteTarget] = useState<Address | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ADDRESSES_QUERY_KEY,
    queryFn: () => addressApi.list(),
    enabled: ready && authed,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ADDRESSES_QUERY_KEY });

  const save = useMutation({
    mutationFn: (input: AddressInput) =>
      editing?.mode === "edit" ? addressApi.update(editing.address.id, input) : addressApi.create(input),
    onSuccess: () => {
      void refresh();
      toast.success(editing?.mode === "edit" ? "Đã cập nhật địa chỉ" : "Đã thêm địa chỉ");
      setEditing(null);
    },
    onError: (e) => toast.error(getCommerceErrorMessage(e, "Không lưu được địa chỉ")),
  });

  const makeDefault = useMutation({
    mutationFn: (a: Address) => addressApi.update(a.id, { ...toInput(a), isDefault: true }),
    onSuccess: () => {
      void refresh();
      toast.success("Đã đặt làm địa chỉ mặc định");
    },
    onError: (e) => toast.error(getCommerceErrorMessage(e, "Không cập nhật được địa chỉ")),
  });

  const remove = useMutation({
    mutationFn: (a: Address) => addressApi.remove(a.id),
    onSuccess: () => {
      void refresh();
      setDeleteTarget(null);
      toast.success("Đã xóa địa chỉ");
    },
    onError: (e) => toast.error(getCommerceErrorMessage(e, "Không xóa được địa chỉ")),
  });

  const header = (
    <CollapsingPageHeader
      title="Địa chỉ giao hàng"
      subtitle="Quản lý địa chỉ nhận hàng của bạn"
      backHref="/profile"
      backLabel="Hồ sơ"
      showMobileBack
    />
  );

  if (ready && !authed) {
    return (
      <PageShell width="full" className={consumerPageShellClass}>
        {header}
        <LoginRequiredNotice next="/profile/addresses" />
      </PageShell>
    );
  }

  const addresses = data ?? [];

  return (
    <PageShell width="full" className={consumerPageShellClass}>
      {header}

      <div className="space-y-4">
        {(!ready || isLoading) && <LoadingSkeleton type="list" count={2} />}
        {error && <ErrorState onRetry={() => refetch()} />}

        {data && !editing && (
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setEditing({ mode: "new" })} data-testid="add-address">
              <Plus className="mr-1.5 h-4 w-4" />
              Thêm địa chỉ mới
            </Button>
          </div>
        )}

        {editing && (
          <section className="surface-card rounded-2xl p-4 sm:p-5">
            <h2 className="mb-3 text-base font-semibold">
              {editing.mode === "edit" ? "Sửa địa chỉ" : "Địa chỉ mới"}
            </h2>
            <AddressForm
              key={editing.mode === "edit" ? editing.address.id : "new"}
              idPrefix="profile-addr"
              initial={editing.mode === "edit" ? toInput(editing.address) : undefined}
              submitting={save.isPending}
              onSubmit={(input) => save.mutate(input)}
              onCancel={() => setEditing(null)}
            />
          </section>
        )}

        {data && addresses.length === 0 && !editing && (
          <div className="rounded-2xl border border-dashed border-border/70 p-10 text-center">
            <MapPin className="mx-auto h-10 w-10 text-muted-foreground/60" aria-hidden />
            <p className="mt-3 text-sm font-medium">Bạn chưa có địa chỉ nào</p>
            <p className="mt-1 text-xs text-muted-foreground">Thêm địa chỉ để đặt hàng nhanh hơn.</p>
          </div>
        )}

        {addresses.length > 0 && (
          <ul className="space-y-3">
            {addresses.map((a) => (
              <li key={a.id} className="surface-card rounded-2xl p-4" data-testid="address-card">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                      {a.recipientName}
                      <span className="font-normal text-muted-foreground">{a.phone}</span>
                      {a.isDefault && <Badge variant="secondary">Mặc định</Badge>}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">{formatAddressLine(a)}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {!a.isDefault && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={makeDefault.isPending}
                        onClick={() => makeDefault.mutate(a)}
                      >
                        Đặt mặc định
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => setEditing({ mode: "edit", address: a })}>
                      <Pencil className="mr-1 h-3.5 w-3.5" />
                      Sửa
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600"
                      onClick={() => setDeleteTarget(a)}
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      Xóa
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Xóa địa chỉ?"
        description={`Địa chỉ của "${deleteTarget?.recipientName ?? ""}" sẽ bị xóa khỏi sổ địa chỉ. Các đơn đã đặt không bị ảnh hưởng.`}
        confirmLabel="Xóa địa chỉ"
        variant="destructive"
        loading={remove.isPending}
        onConfirm={() => deleteTarget && remove.mutate(deleteTarget)}
      />
    </PageShell>
  );
}
