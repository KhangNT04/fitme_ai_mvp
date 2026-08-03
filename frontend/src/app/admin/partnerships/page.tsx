"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi, type BrandPartnership } from "@/services/admin-api";
import { PortalAdminPage } from "@/components/portal/PortalAdminPage";
import { PortalActionButton } from "@/components/portal/PortalActionButton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { portalCardClass, portalCardRowClass } from "@/lib/design-tokens";
import { actionFeedback } from "@/lib/action-feedback";

export default function AdminPartnershipsPage() {
  const queryClient = useQueryClient();
  const [brandAId, setBrandAId] = useState<string>("");
  const [brandBId, setBrandBId] = useState<string>("");

  const brandsQuery = useQuery({
    queryKey: ["admin-brands"],
    queryFn: () => adminApi.getBrands(),
  });

  const partnershipsQuery = useQuery({
    queryKey: ["admin-brand-partnerships"],
    queryFn: () => adminApi.getBrandPartnerships(),
  });

  const brandNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of brandsQuery.data ?? []) {
      map.set(b.id, b.name);
    }
    return map;
  }, [brandsQuery.data]);

  const create = useMutation({
    mutationFn: () => adminApi.createBrandPartnership(brandAId, brandBId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-brand-partnerships"] });
      setBrandAId("");
      setBrandBId("");
      actionFeedback({ successMessage: "Đã lưu partnership (cặp brand cho Plus look)" }).onSuccess();
    },
    onError: actionFeedback({ errorMessage: "Không tạo được partnership" }).onError,
  });

  const approvedBrands = (brandsQuery.data ?? []).filter((b) => b.status === "APPROVED");
  const isLoading = brandsQuery.isLoading || partnershipsQuery.isLoading;
  const error = brandsQuery.error || partnershipsQuery.error;

  return (
    <PortalAdminPage
      title="Brand partnerships"
      description="Cặp brand liên kết — Plus scoring dùng để boost “Partner look”."
      isLoading={isLoading}
      error={error}
      onRetry={() => {
        void brandsQuery.refetch();
        void partnershipsQuery.refetch();
      }}
      empty={false}
    >
      <section className={`${portalCardClass} space-y-3 p-4`}>
        <h2 className="text-sm font-semibold">Thêm / kích hoạt cặp brand</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <BrandSelect
            label="Brand A"
            value={brandAId}
            onChange={setBrandAId}
            brands={approvedBrands}
            excludeId={brandBId}
          />
          <BrandSelect
            label="Brand B"
            value={brandBId}
            onChange={setBrandBId}
            brands={approvedBrands}
            excludeId={brandAId}
          />
        </div>
        <PortalActionButton
          variant="approve"
          disabled={!brandAId || !brandBId || brandAId === brandBId || create.isPending}
          onClick={() => create.mutate()}
        >
          Lưu partnership
        </PortalActionButton>
      </section>

      <section className="mt-4 space-y-2">
        <h2 className="text-sm font-semibold">Đang active</h2>
        {(partnershipsQuery.data ?? []).length === 0 ? (
          <p className="rounded-xl border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
            Chưa có partnership. Seed mặc định: K-Style House ↔ Seoul Basic (nếu catalog seed còn).
          </p>
        ) : (
          (partnershipsQuery.data as BrandPartnership[]).map((p) => (
            <article key={p.id} className={portalCardClass}>
              <div className={portalCardRowClass}>
                <div className="min-w-0">
                  <p className="font-medium text-foreground">
                    {brandNameById.get(p.brandAId) ?? p.brandAId.slice(0, 8)}
                    <span className="mx-2 text-muted-foreground">↔</span>
                    {brandNameById.get(p.brandBId) ?? p.brandBId.slice(0, 8)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {p.createdAt ? new Date(p.createdAt).toLocaleString("vi-VN") : "—"}
                  </p>
                </div>
                <Badge variant="outline">{p.status}</Badge>
              </div>
            </article>
          ))
        )}
      </section>
    </PortalAdminPage>
  );
}

function BrandSelect({
  label,
  value,
  onChange,
  brands,
  excludeId,
}: {
  label: string;
  value: string;
  onChange: (id: string) => void;
  brands: { id: string; name: string }[];
  excludeId?: string;
}) {
  const options = brands.filter((b) => b.id !== excludeId);
  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Chọn brand" />
        </SelectTrigger>
        <SelectContent>
          {options.map((b) => (
            <SelectItem key={b.id} value={b.id}>
              {b.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
