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
import { normalizeBrandLinks } from "@/lib/brand-links";
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
      const payload = normalizeBrandLinks(data);
      await brandApi.apply({
        ...payload,
        websiteUrl: payload.websiteUrl || undefined,
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
          Bạn cần tài khoản người dùng để gửi đơn đăng ký brand. Sau khi được duyệt, sản phẩm của bạn
          được FitMe gợi ý kèm link về cửa hàng của bạn và bạn dùng dashboard phân tích miễn phí. Có thể nâng cấp
          gói Brand Plus bất cứ lúc nào nếu muốn được ưu tiên hiển thị.
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
      <p className="mb-4 text-sm text-muted-foreground">
        Đăng ký brand trên FitMe: niêm yết sản phẩm kèm link mua tại cửa hàng của bạn, nhận khách từ tư vấn AI. Niêm
        yết và dashboard phân tích miễn phí khi brand được duyệt. Gói Brand Plus (tùy chọn) giúp sản phẩm được ưu
        tiên trong gợi ý phối đồ, cho khách thử đồ AI miễn phí với sản phẩm của bạn và xem khách có nhu cầu mua.
      </p>
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
          <Input {...register("websiteUrl")} className="mt-1" inputMode="url" placeholder="teelab.vn" />
          {errors.websiteUrl && <p className="mt-1 text-xs text-red-600">{errors.websiteUrl.message}</p>}
        </div>
        <div>
          <Label>Shopee URL</Label>
          <Input {...register("shopeeUrl")} className="mt-1" inputMode="url" placeholder="shopee.vn/ten-shop" />
          {errors.shopeeUrl && <p className="mt-1 text-xs text-red-600">{errors.shopeeUrl.message}</p>}
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
