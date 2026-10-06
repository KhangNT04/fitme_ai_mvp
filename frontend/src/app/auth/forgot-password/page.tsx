"use client";

import { useState } from "react";
import Link from "next/link";
import { authApi } from "@/services/auth-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthCardShell } from "@/components/layout/AuthCardShell";
import { getUserErrorMessage } from "@/lib/user-error-message";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await authApi.forgotPassword({ email });
      setSent(true);
    } catch (err: unknown) {
      setError(getUserErrorMessage(err, "Không gửi được yêu cầu đặt lại mật khẩu. Vui lòng thử lại."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCardShell
      title="Quên mật khẩu"
      backHref="/auth/login"
      backLabel="Quay lại đăng nhập"
      footer={
        <p className="mt-4 text-center text-sm">
          <Link href="/auth/login" className="text-muted-foreground hover:underline">Quay lại đăng nhập</Link>
        </p>
      }
    >
      {sent ? (
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            Nếu email đã đăng ký, chúng tôi vừa gửi link đặt lại mật khẩu (hiệu lực 60 phút). Kiểm tra hộp thư,
            kể cả mục Spam.
          </p>
          <p>
            <Link href="/auth/reset-password" className="font-medium underline">
              Đã có mã? Nhập mã để đặt lại mật khẩu
            </Link>
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" required />
          </div>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Đang gửi..." : "Gửi link đặt lại"}
          </Button>
        </form>
      )}
    </AuthCardShell>
  );
}
