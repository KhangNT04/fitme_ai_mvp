"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authApi } from "@/services/auth-api";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthCardShell } from "@/components/layout/AuthCardShell";
import { getUserErrorMessage } from "@/lib/user-error-message";

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[80vh] items-center justify-center px-4 text-muted-foreground">Đang tải...</div>}>
      <VerifyEmailForm />
    </Suspense>
  );
}

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, setAuth } = useAuthStore();
  const emailFromQuery = searchParams.get("email") || "";
  const hint = searchParams.get("hint") || "";
  const [email, setEmail] = useState(emailFromQuery || user?.email || "");
  const [code, setCode] = useState(hint);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (emailFromQuery) setEmail(emailFromQuery);
  }, [emailFromQuery]);

  useEffect(() => {
    if (hint) setCode(hint);
  }, [hint]);

  const handleVerify = async () => {
    if (!email.trim() || !code.trim()) return;
    setLoading(true);
    setError("");
    setInfo("");
    try {
      const res = await authApi.verifyEmail({ email: email.trim(), code: code.trim() });
      await setAuth(res.user, res.accessToken, res.refreshToken);
      router.push("/profile");
    } catch (e: unknown) {
      setError(getUserErrorMessage(e, "Mã xác minh không hợp lệ"));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email.trim()) {
      setError("Nhập email để nhận lại mã");
      return;
    }
    setResending(true);
    setError("");
    setInfo("");
    try {
      const result = await authApi.resendVerification(email.trim());
      setInfo(result.message);
      if (result.verificationCode) {
        setCode(result.verificationCode);
      }
    } catch (e: unknown) {
      setError(getUserErrorMessage(e, "Không gửi lại được mã"));
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthCardShell
      title="Xác nhận tài khoản"
      backHref="/auth/login"
      backLabel="Đăng nhập"
      footer={
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Đã xác nhận? <Link href="/auth/login" className="underline">Đăng nhập</Link>
        </p>
      }
    >
      <p className="text-sm text-muted-foreground">
        Nhập mã xác nhận để kích hoạt tài khoản và hạn chế đăng ký tự động.
        {hint ? " Mã demo đã được điền sẵn (môi trường không gửi email)." : ""}
      </p>
      <div className="mt-4 space-y-4">
        <div>
          <Label>Email</Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1"
            placeholder="you@email.com"
          />
        </div>
        <div>
          <Label>Mã xác nhận</Label>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="mt-1"
            placeholder="123456"
            inputMode="numeric"
            autoComplete="one-time-code"
          />
        </div>
      </div>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {info && <p className="mt-4 text-sm text-muted-foreground">{info}</p>}
      <Button className="mt-4 w-full" onClick={() => void handleVerify()} disabled={loading || !email || !code}>
        {loading ? "Đang xác minh..." : "Xác nhận & vào FitMe"}
      </Button>
      <Button
        type="button"
        variant="ghost"
        className="mt-2 w-full"
        onClick={() => void handleResend()}
        disabled={resending || !email}
      >
        {resending ? "Đang tạo mã..." : "Gửi lại mã"}
      </Button>
    </AuthCardShell>
  );
}
