"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

export default function BrandLoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  usePortalSessionRedirect("brand");
  const [error, setError] = useState("");
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      const res = await authApi.login(data);
      if (res.user.role !== "BRAND") {
        setError("Tài khoản này không có quyền Brand. Vui lòng dùng tài khoản brand.");
        return;
      }
      await setAuth(res.user, res.accessToken, res.refreshToken);
      router.push("/brand/dashboard");
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
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label>Email</Label>
          <Input type="email" {...register("email")} className="mt-1" />
        </div>
        <div>
          <Label>Mật khẩu</Label>
          <Input type="password" {...register("password")} className="mt-1" />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" className="w-full" disabled={isSubmitting}>Đăng nhập</Button>
      </form>
    </PortalLoginShell>
  );
}
