"use client";

import { useState } from "react";
import Link from "next/link";
import { authApi } from "@/services/auth-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthCardShell } from "@/components/layout/AuthCardShell";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.forgotPassword({ email });
      setSent(true);
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
          <p>Nếu email tồn tại, token đặt lại mật khẩu đã được tạo (MVP: xem log backend).</p>
          <p>
            <Link href="/auth/reset-password" className="font-medium underline">
              Nhập token để đặt lại mật khẩu
            </Link>
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" required />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Đang gửi..." : "Gửi link đặt lại"}
          </Button>
        </form>
      )}
    </AuthCardShell>
  );
}
