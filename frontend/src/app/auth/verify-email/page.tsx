"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/services/auth-api";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthCardShell } from "@/components/layout/AuthCardShell";
import { getUserErrorMessage } from "@/lib/user-error-message";

export default function VerifyEmailPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (!user?.email) return;
    setLoading(true);
    setError("");
    try {
      await authApi.verifyEmail({ email: user.email, code });
      router.push("/profile");
    } catch (e: unknown) {
      setError(getUserErrorMessage(e, "Mã xác minh không hợp lệ"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCardShell title="Xác minh email" backHref="/profile" backLabel="Hồ sơ của tôi">
      <p className="text-sm text-muted-foreground">
        Nhập mã xác minh đã gửi đến {user?.email || "email của bạn"}
      </p>
      <div className="mt-4">
        <Label>Mã xác minh</Label>
        <Input value={code} onChange={(e) => setCode(e.target.value)} className="mt-1" placeholder="123456" />
      </div>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      <Button className="mt-4 w-full" onClick={handleVerify} disabled={loading || !code}>
        {loading ? "Đang xác minh..." : "Xác minh"}
      </Button>
    </AuthCardShell>
  );
}
