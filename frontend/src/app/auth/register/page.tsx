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
import { registerSchema, type RegisterForm } from "@/utils/validators";

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-md px-4 py-12 text-center text-muted-foreground">Đang tải...</div>}>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const { goAfterAuth } = useAuthRedirect();
  const { setAuth } = useAuthStore();
  const [error, setError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    setError("");
    try {
      const res = await authApi.register({
        email: data.email,
        password: data.password,
        fullName: data.fullName,
      });
      setAuth(res.user, res.accessToken, res.refreshToken);
      goAfterAuth();
    } catch (e: unknown) {
      setError((e as { message?: string })?.message || "Đăng ký thất bại");
    }
  };

  return (
    <AuthCardShell
      title="Đăng ký tài khoản"
      backHref="/auth/login"
      backLabel="Quay lại đăng nhập"
      footer={
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Đã có tài khoản? <Link href="/auth/login" className="underline">Đăng nhập</Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label>Họ tên</Label>
          <Input {...register("fullName")} className="mt-1" />
          {errors.fullName && <p className="mt-1 text-xs text-red-600">{errors.fullName.message}</p>}
        </div>
        <div>
          <Label>Email</Label>
          <Input type="email" {...register("email")} className="mt-1" />
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
        </div>
        <div>
          <Label>Mật khẩu</Label>
          <Input type="password" {...register("password")} className="mt-1" />
          {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
        </div>
        <div>
          <Label>Xác nhận mật khẩu</Label>
          <Input type="password" {...register("confirmPassword")} className="mt-1" />
          {errors.confirmPassword && <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>}
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" className="w-full" disabled={isSubmitting}>Đăng ký</Button>
      </form>
    </AuthCardShell>
  );
}
