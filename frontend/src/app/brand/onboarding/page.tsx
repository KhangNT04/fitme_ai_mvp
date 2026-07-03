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
import { AuthCardShell } from "@/components/layout/AuthCardShell";
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
      <AuthCardShell
        title="Đăng ký đối tác Brand"
        backHref="/"
        backLabel="Trang chủ"
        footer={
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Đã có tài khoản?{" "}
            <Link href="/auth/login?redirect=/brand/onboarding" className="underline">
              Đăng nhập
            </Link>
          </p>
        }
      >
        <p className="text-sm text-muted-foreground">
          Bạn cần tài khoản người dùng để gửi đơn đăng ký brand.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Button asChild className="w-full sm:flex-1">
            <Link href="/auth/register?redirect=/brand/onboarding">Đăng ký</Link>
          </Button>
          <Button variant="outline" asChild className="w-full sm:flex-1">
            <Link href="/auth/login?redirect=/brand/onboarding">Đăng nhập</Link>
          </Button>
        </div>
      </AuthCardShell>
    );
  }

  return (
    <AuthCardShell title="Đăng ký đối tác Brand" backHref="/" backLabel="Trang chủ">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label>Tên thương hiệu</Label>
          <Input {...register("name")} className="mt-1" />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Email liên hệ</Label>
            <Input type="email" {...register("contactEmail")} className="mt-1" />
            {errors.contactEmail && <p className="mt-1 text-xs text-red-600">{errors.contactEmail.message}</p>}
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
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Đang gửi..." : "Gửi đơn đăng ký"}
        </Button>
      </form>
    </AuthCardShell>
  );
}
