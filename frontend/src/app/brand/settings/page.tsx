"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { brandApi } from "@/services/brand-api";
import { PortalLayout, brandNav } from "@/components/layout/PortalLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import type { BrandOnboardingRequest } from "@/types/brand";

export default function BrandSettingsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["brand-me"],
    queryFn: () => brandApi.getMe(),
  });
  const [editing, setEditing] = useState(false);
  const { register, handleSubmit, reset } = useForm<BrandOnboardingRequest>();

  const update = useMutation({
    mutationFn: (payload: BrandOnboardingRequest) => brandApi.updateMe(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brand-me"] });
      setEditing(false);
    },
  });

  const startEdit = () => {
    if (data) {
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

  return (
    <PortalLayout title="Brand" nav={brandNav}>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">Cài đặt thương hiệu</h1>
        {data && !editing && (
          <Button variant="outline" onClick={startEdit}>Chỉnh sửa</Button>
        )}
      </div>
      {isLoading ? <LoadingSkeleton count={1} /> : data && (
        <Card className="mt-8">
          <CardHeader><CardTitle>{data.name}</CardTitle></CardHeader>
          <CardContent>
            {editing ? (
              <form onSubmit={handleSubmit((d) => update.mutate(d))} className="space-y-4">
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
                <div className="flex gap-2">
                  <Button type="submit" disabled={update.isPending}>Lưu</Button>
                  <Button type="button" variant="outline" onClick={() => setEditing(false)}>Hủy</Button>
                </div>
              </form>
            ) : (
              <div className="space-y-2 text-sm">
                <p><strong>Email liên hệ:</strong> {data.contactEmail ?? "—"}</p>
                <p><strong>Điện thoại:</strong> {data.contactPhone ?? "—"}</p>
                <p><strong>Trạng thái:</strong> <Badge>{data.status}</Badge></p>
                {data.websiteUrl && <p><strong>Website:</strong> {data.websiteUrl}</p>}
                {data.shopeeUrl && <p><strong>Shopee:</strong> {data.shopeeUrl}</p>}
                {data.description && <p><strong>Mô tả:</strong> {data.description}</p>}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </PortalLayout>
  );
}
