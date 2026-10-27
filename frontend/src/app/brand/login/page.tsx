"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { authApi } from "@/services/auth-api";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PortalLoginShell } from "@/components/layout/PortalLoginShell";
import { getUserErrorMessage } from "@/lib/user-error-message";
import { loginSchema, type LoginForm } from "@/utils/validators";
import { usePortalSessionRedirect } from "@/hooks/use-portal-session-redirect";
import { safeInternalPath } from "@/lib/safe-redirect";

export default function BrandLoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[80vh] items-center justify-center px-4 text-muted-foreground">Đang tải...</div>}>
      <BrandLoginForm />
    </Suspense>
  );
}

function BrandLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useAuthStore();
  usePortalSessionRedirect("brand");
  const [error, setError] = useState("");
  // Where the brand was headed before the session ended, so a new sign-in resumes the work.
  const redirectTo = safeInternalPath(searchParams.get("redirect")) ?? "/brand/dashboard";
  const sessionExpired = searchParams.get("expired") === "1";
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setError("");
    try {
      const res = await authApi.login(data, { persist: false });
      if (res.user.role !== "BRAND") {
        void authApi.revokeRefreshToken(res.refreshToken);
        setError("Tài khoản này không có quyền Brand. Vui lòng dùng tài khoản brand.");
        return;
      }
      await setAuth(res.user, res.accessToken, res.refreshToken);
      router.push(redirectTo);
      router.refresh();
    } catch (e: unknown) {
      setError(getUserErrorMessage(e, { fallback: "Đăng nhập thất bại", context: "brand-auth" }));
    }
  };

  return (
    <PortalLoginShell
      title="Brand Portal — Đăng nhập"
      footer={
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Chưa có tài khoản? <Link href="/brand/onboarding" className="underline">Đăng ký brand</Link>
        </p>
      }
    >
      {sessionExpired && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800" role="status">
          Phiên làm việc đã kết thúc do không hoạt động quá lâu. Vui lòng đăng nhập lại để tiếp tục.
        </p>
      )}
      <p className="mb-4 text-sm text-muted-foreground">
        Đăng nhập để quản lý sản phẩm, link mua hàng và dashboard phân tích miễn phí sau khi
        brand được duyệt.
      </p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...register("email")} className="mt-1" aria-invalid={!!errors.email} />
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
        </div>
        <div>
          <Label htmlFor="password">Mật khẩu</Label>
          <Input id="password" type="password" {...register("password")} className="mt-1" aria-invalid={!!errors.password} />
          {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" className="w-full" disabled={isSubmitting}>Đăng nhập</Button>
      </form>
    </PortalLoginShell>
  );
}
