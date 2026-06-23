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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loginSchema, type LoginForm } from "@/utils/validators";

export default function AdminLoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [error, setError] = useState("");
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      const res = await authApi.login(data);
      if (res.user.role !== "ADMIN") {
        setError("Tài khoản này không có quyền Admin.");
        return;
      }
      setAuth(res.user, res.accessToken, res.refreshToken);
      router.push("/admin/dashboard");
    } catch (e: unknown) {
      setError((e as { message?: string })?.message || "Đăng nhập thất bại");
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader><CardTitle>Admin — Đăng nhập</CardTitle></CardHeader>
        <CardContent>
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
          <p className="mt-4 text-center text-sm"><Link href="/" className="text-stone-500 hover:underline">Về trang chủ</Link></p>
        </CardContent>
      </Card>
    </div>
  );
}
