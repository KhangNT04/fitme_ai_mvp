"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { authApi } from "@/services/auth-api";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthCardShell } from "@/components/layout/AuthCardShell";
import { useAuthRedirect } from "@/hooks/use-auth-redirect";
import { getUserErrorMessage } from "@/lib/user-error-message";
import { loginSchema, type LoginForm } from "@/utils/validators";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[80vh] items-center justify-center px-4 text-muted-foreground">Đang tải...</div>}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const { goAfterAuth } = useAuthRedirect();
  const { setAuth } = useAuthStore();
  const [error, setError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setError("");
    try {
      const res = await authApi.login(data);
      await setAuth(res.user, res.accessToken, res.refreshToken);
      await goAfterAuth();
    } catch (e: unknown) {
      setError(getUserErrorMessage(e, { fallback: "Đăng nhập thất bại", context: "auth" }));
    }
  };

  return (
    <AuthCardShell
      title="Đăng nhập"
      backHref="/"
      backLabel="Trang chủ"
      footer={
        <div className="mt-4 text-center text-sm text-muted-foreground">
          <Link href="/auth/forgot-password" className="hover:underline">Quên mật khẩu?</Link>
          <span className="mx-2">·</span>
          <Link href="/auth/register" className="hover:underline">Đăng ký</Link>
        </div>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...register("email")} className="mt-1" />
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
        </div>
        <div>
          <Label htmlFor="password">Mật khẩu</Label>
          <Input id="password" type="password" {...register("password")} className="mt-1" />
          {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
        </Button>
      </form>
    </AuthCardShell>
  );
}
