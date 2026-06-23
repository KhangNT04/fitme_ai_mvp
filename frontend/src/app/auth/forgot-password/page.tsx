"use client";

import { useState } from "react";
import Link from "next/link";
import { authApi } from "@/services/auth-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    <div className="mx-auto max-w-md px-4 py-12">
      <Card>
        <CardHeader><CardTitle>Quên mật khẩu</CardTitle></CardHeader>
        <CardContent>
          {sent ? (
            <p className="text-sm text-stone-600">
              Nếu email tồn tại, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu.
            </p>
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
          <p className="mt-4 text-center text-sm">
            <Link href="/auth/login" className="text-stone-500 hover:underline">Quay lại đăng nhập</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
