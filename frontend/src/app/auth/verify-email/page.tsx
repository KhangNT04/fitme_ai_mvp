"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/services/auth-api";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
      setError((e as { message?: string })?.message || "Mã xác minh không hợp lệ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <Card>
        <CardHeader><CardTitle>Xác minh email</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-stone-500">
            Nhập mã xác minh đã gửi đến {user?.email || "email của bạn"}
          </p>
          <div>
            <Label>Mã xác minh</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} className="mt-1" placeholder="123456" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button className="w-full" onClick={handleVerify} disabled={loading || !code}>
            {loading ? "Đang xác minh..." : "Xác minh"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
