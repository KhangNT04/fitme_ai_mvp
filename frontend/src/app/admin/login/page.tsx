"use client";

import { useState } from "react";
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
import type { AuthResponse } from "@/types/auth";

export default function AdminLoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  usePortalSessionRedirect("admin");
  const [error, setError] = useState("");
  const [twoFactorToken, setTwoFactorToken] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const finish = async (res: AuthResponse) => {
    if (res.user.role !== "ADMIN") {
      void authApi.revokeRefreshToken(res.refreshToken);
      setError("Tài khoản này không có quyền Admin.");
      return;
    }
    await setAuth(res.user, res.accessToken, res.refreshToken);
    router.push("/admin/dashboard");
    router.refresh();
  };

  const onSubmit = async (data: LoginForm) => {
    setError("");
    try {
      const res = await authApi.login(data, { persist: false });
      if (res.requiresTwoFactor && res.twoFactorToken) {
        setTwoFactorToken(res.twoFactorToken);
        setCode("");
        return;
      }
      await finish(res);
    } catch (e: unknown) {
      setError(getUserErrorMessage(e, { fallback: "Đăng nhập thất bại", context: "admin-auth" }));
    }
  };

  const onVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFactorToken || !code.trim()) return;
    setError("");
    setVerifying(true);
    try {
      await finish(await authApi.loginTwoFactor(twoFactorToken, code.trim()));
    } catch (err: unknown) {
      const message = getUserErrorMessage(err, { fallback: "Mã xác thực không đúng", context: "admin-auth" });
      setError(message);
      if ((err as { code?: string })?.code === "MFA_CHALLENGE_EXPIRED") {
        setTwoFactorToken(null);
      }
    } finally {
      setVerifying(false);
    }
  };

  if (twoFactorToken) {
    return (
      <PortalLoginShell title="Admin — Xác thực 2 bước">
        <form onSubmit={onVerify} className="space-y-4" noValidate>
          <p className="text-sm text-muted-foreground">
            Mở ứng dụng xác thực (Google Authenticator, Authy, 1Password…) và nhập mã 6 số cho FitMe AI. Mất điện
            thoại? Nhập một mã khôi phục.
          </p>
          <div>
            <Label htmlFor="totp-code">Mã xác thực</Label>
            <Input
              id="totp-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              maxLength={20}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="mt-1 tracking-widest"
              placeholder="123456"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={verifying || !code.trim()}>
            {verifying ? "Đang xác thực..." : "Xác nhận"}
          </Button>
          <button
            type="button"
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
            onClick={() => {
              setTwoFactorToken(null);
              setError("");
            }}
          >
            Quay lại đăng nhập
          </button>
        </form>
      </PortalLoginShell>
    );
  }

  return (
    <PortalLoginShell title="Admin — Đăng nhập">
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
