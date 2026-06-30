"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { brandApi } from "@/services/brand-api";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { getUserErrorMessage } from "@/lib/user-error-message";
import { brandOnboardingSchema, type BrandOnboardingForm } from "@/utils/validators";

export default function BrandOnboardingPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [error, setError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<BrandOnboardingForm>({
    resolver: zodResolver(brandOnboardingSchema),
    defaultValues: { contactEmail: user?.email ?? "" },
  });

  useEffect(() => {
    if (isAuthenticated() && user?.role === "BRAND") {
      router.replace("/brand/dashboard");
    }
  }, [isAuthenticated, user, router]);

  const onSubmit = async (data: BrandOnboardingForm) => {
    if (!isAuthenticated()) {
      router.push("/auth/register?redirect=/brand/onboarding");
      return;
    }
    setError("");
    try {
      await brandApi.apply({
        ...data,
        websiteUrl: data.websiteUrl || undefined,
      });
      router.push("/brand/pending");
    } catch (e: unknown) {
      setError(getUserErrorMessage(e, "Gửi đơn thất bại"));
    }
  };

  if (!isAuthenticated()) {
    return (
      <PageShell width="medium" className="py-12 text-center">
        <PageHeader
          title="Đăng ký đối tác Brand"
          subtitle="Bạn cần tài khoản người dùng để gửi đơn đăng ký brand."
          backHref="/"
          backLabel="Trang chủ"
        />
        <div className="flex justify-center gap-3">
          <Button asChild><Link href="/auth/register?redirect=/brand/onboarding">Đăng ký</Link></Button>
          <Button variant="outline" asChild><Link href="/auth/login?redirect=/brand/onboarding">Đăng nhập</Link></Button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell width="medium" className="py-12">
      <PageHeader title="Đăng ký đối tác Brand" backHref="/" backLabel="Trang chủ" />

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label>Tên thương hiệu</Label>
              <Input {...register("name")} className="mt-1" />
              {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Email liên hệ</Label>
                <Input type="email" {...register("contactEmail")} className="mt-1" />
                {errors.contactEmail && <p className="text-xs text-red-600">{errors.contactEmail.message}</p>}
              </div>
              <div>
                <Label>Điện thoại</Label>
                <Input {...register("contactPhone")} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Website</Label>
              <Input {...register("websiteUrl")} className="mt-1" placeholder="https://" />
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
            <Button type="submit" className="w-full" disabled={isSubmitting}>Gửi đơn đăng ký</Button>
          </form>
        </CardContent>
      </Card>
    </PageShell>
  );
}
