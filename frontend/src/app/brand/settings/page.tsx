"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { brandApi } from "@/services/brand-api";
import { PortalLayout, brandNav } from "@/components/layout/PortalLayout";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { BrandImageUpload } from "@/components/brand/BrandImageUpload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { ErrorState } from "@/components/common/ErrorState";
import type { BrandOnboardingRequest } from "@/types/brand";

import { brandStatusLabel } from "@/lib/status-labels";
import { actionFeedback } from "@/lib/action-feedback";

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-border/40 py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  );
}

export default function BrandSettingsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["brand-me"],
    queryFn: () => brandApi.getMe(),
  });
  const [editing, setEditing] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>("");
  const { register, handleSubmit, reset } = useForm<BrandOnboardingRequest>();

  const update = useMutation({
    mutationFn: (payload: BrandOnboardingRequest) =>
      brandApi.updateMe({
        ...payload,
        logoUrl: logoUrl || data?.logoUrl,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brand-me"] });
      setEditing(false);
      actionFeedback({ successMessage: "Đã cập nhật thông tin thương hiệu" }).onSuccess();
    },
    onError: actionFeedback({ errorMessage: "Không thể cập nhật thương hiệu" }).onError,
  });

  const uploadLogo = useMutation({
    mutationFn: (file: File) => brandApi.uploadLogo(file),
    onSuccess: (brand) => {
      setLogoUrl(brand.logoUrl ?? "");
      queryClient.invalidateQueries({ queryKey: ["brand-me"] });
      actionFeedback({ successMessage: "Đã cập nhật logo" }).onSuccess();
    },
    onError: actionFeedback({ errorMessage: "Không thể tải logo lên" }).onError,
  });

  const startEdit = () => {
    if (data) {
      setLogoUrl(data.logoUrl ?? "");
      reset({
        name: data.name,
        contactEmail: data.contactEmail ?? "",
        contactPhone: data.contactPhone ?? "",
        websiteUrl: data.websiteUrl ?? "",
        shopeeUrl: data.shopeeUrl ?? "",
        description: data.description ?? "",
      });
      setEditing(true);
    }
  };

  const currentLogo = editing ? logoUrl : data?.logoUrl;

  return (
    <PortalLayout title="Brand" nav={brandNav}>
      <PortalPageHeader
        title="Cài đặt thương hiệu"
        description="Logo, thông tin liên hệ và liên kết cửa hàng."
      >
        {data && !editing && <Button variant="outline" onClick={startEdit}>Chỉnh sửa</Button>}
      </PortalPageHeader>

      {isLoading && <LoadingSkeleton count={1} />}
      {error && <ErrorState onRetry={() => refetch()} />}
      {data && (
        <Card>
          <CardHeader>
            <CardTitle>{data.name}</CardTitle>
          </CardHeader>
          <CardContent>
            {editing ? (
              <form onSubmit={handleSubmit((d) => update.mutate(d))} className="space-y-5">
                <BrandImageUpload
                  label="Logo thương hiệu"
                  hint="Ảnh vuông, hiển thị trên Khám phá và trang brand."
                  value={currentLogo}
                  onChange={setLogoUrl}
                  onUpload={async (file) => {
                    const brand = await uploadLogo.mutateAsync(file);
                    return brand.logoUrl ?? "";
                  }}
                  disabled={uploadLogo.isPending || update.isPending}
                />

                <div>
                  <Label>Tên thương hiệu</Label>
                  <Input {...register("name")} className="mt-1" />
                </div>
                <div>
                  <Label>Email liên hệ</Label>
                  <Input {...register("contactEmail")} className="mt-1" />
                </div>
                <div>
                  <Label>Điện thoại</Label>
                  <Input {...register("contactPhone")} className="mt-1" />
                </div>
                <div>
                  <Label>Website</Label>
                  <Input {...register("websiteUrl")} className="mt-1" />
                </div>
                <div>
                  <Label>Shopee URL</Label>
                  <Input {...register("shopeeUrl")} className="mt-1" />
                </div>
                <div>
                  <Label>Mô tả</Label>
                  <Input {...register("description")} className="mt-1" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" disabled={update.isPending || uploadLogo.isPending}>
                    {update.isPending ? "Đang lưu..." : "Lưu"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setEditing(false)}>Hủy</Button>
                </div>
              </form>
            ) : (
              <div className="space-y-5">
                <BrandImageUpload
                  label="Logo thương hiệu"
                  value={data.logoUrl}
                  onUpload={async (file) => {
                    const brand = await uploadLogo.mutateAsync(file);
                    return brand.logoUrl ?? "";
                  }}
                  disabled={uploadLogo.isPending}
                />

                <div className="rounded-2xl border border-border/60 bg-muted/20 px-4">
                  <InfoRow label="Email liên hệ">{data.contactEmail ?? "—"}</InfoRow>
                  <InfoRow label="Điện thoại">{data.contactPhone ?? "—"}</InfoRow>
                  <InfoRow label="Trạng thái">
                    <Badge variant="outline">{brandStatusLabel(data.status)}</Badge>
                  </InfoRow>
                  {data.websiteUrl && <InfoRow label="Website">{data.websiteUrl}</InfoRow>}
                  {data.shopeeUrl && <InfoRow label="Shopee">{data.shopeeUrl}</InfoRow>}
                  {data.description && <InfoRow label="Mô tả">{data.description}</InfoRow>}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </PortalLayout>
  );
}
