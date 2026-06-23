"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { brandApi } from "@/services/brand-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { brandOnboardingSchema, type BrandOnboardingForm } from "@/utils/validators";
import { PRODUCT_CATEGORIES } from "@/utils/constants";

export default function BrandOnboardingPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<BrandOnboardingForm>({
    resolver: zodResolver(brandOnboardingSchema),
  });

  const onSubmit = async (data: BrandOnboardingForm) => {
    try {
      await brandApi.onboarding(data);
      router.push("/brand/login");
    } catch (e: unknown) {
      setError((e as { message?: string })?.message || "Đăng ký thất bại");
    }
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle>Đăng ký đối tác Brand</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Tên thương hiệu</Label>
                <Input {...register("name")} className="mt-1" />
                {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
              </div>
              <div>
                <Label>Chủ sở hữu</Label>
                <Input {...register("ownerName")} className="mt-1" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Email</Label>
                <Input type="email" {...register("email")} className="mt-1" />
              </div>
              <div>
                <Label>Điện thoại</Label>
                <Input {...register("phone")} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Danh mục sản phẩm</Label>
              <select {...register("productCategory")} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm">
                <option value="">Chọn</option>
                {PRODUCT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <Label>Website</Label>
              <Input {...register("website")} className="mt-1" />
            </div>
            <div>
              <Label>Shopee URL</Label>
              <Input {...register("shopeeUrl")} className="mt-1" />
            </div>
            <div>
              <Label>Mô tả thương hiệu</Label>
              <Input {...register("description")} className="mt-1" />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={isSubmitting}>Gửi đăng ký</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
