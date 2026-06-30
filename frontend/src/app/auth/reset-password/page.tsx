"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { authApi } from "@/services/auth-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthCardShell } from "@/components/layout/AuthCardShell";
import { getUserErrorMessage } from "@/lib/user-error-message";
import { resetPasswordSchema, type ResetPasswordForm } from "@/utils/validators";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-md px-4 py-12 text-center text-muted-foreground">Đang tải...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token: searchParams.get("token") ?? "" },
  });

  const onSubmit = async (data: ResetPasswordForm) => {
    setError("");
    try {
      await authApi.resetPassword({ token: data.token, newPassword: data.newPassword });
      setSuccess(true);
      setTimeout(() => router.push("/auth/login"), 2000);
    } catch (e: unknown) {
      setError(getUserErrorMessage(e, "Đặt lại mật khẩu thất bại"));
    }
  };

  return (
    <AuthCardShell
      title="Đặt lại mật khẩu"
      backHref="/auth/login"
      backLabel="Quay lại đăng nhập"
      footer={
        <p className="mt-4 text-center text-sm">
          <Link href="/auth/login" className="text-muted-foreground hover:underline">Quay lại đăng nhập</Link>
        </p>
      }
    >
      {success ? (
        <p className="text-sm text-muted-foreground">
          Mật khẩu đã được cập nhật. Đang chuyển đến trang đăng nhập...
        </p>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>Mã token</Label>
            <Input {...register("token")} className="mt-1" placeholder="Dán token từ email/log server" />
            {errors.token && <p className="mt-1 text-xs text-red-600">{errors.token.message}</p>}
          </div>
          <div>
            <Label>Mật khẩu mới</Label>
            <Input type="password" {...register("newPassword")} className="mt-1" />
            {errors.newPassword && <p className="mt-1 text-xs text-red-600">{errors.newPassword.message}</p>}
          </div>
          <div>
            <Label>Xác nhận mật khẩu</Label>
            <Input type="password" {...register("confirmPassword")} className="mt-1" />
            {errors.confirmPassword && <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>}
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
          </Button>
        </form>
      )}
    </AuthCardShell>
  );
}
