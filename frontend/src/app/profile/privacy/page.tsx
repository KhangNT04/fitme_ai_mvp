"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { privacyApi } from "@/services/privacy-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";

export default function ProfilePrivacyPage() {
  const router = useRouter();
  const { isAuthenticated, logout } = useAuthStore();
  const [requestType, setRequestType] = useState<
    "RECOMMENDATION_HISTORY" | "PHOTO_UPLOAD" | "ALL"
  >("RECOMMENDATION_HISTORY");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isAuthenticated()) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-muted-foreground">Vui lòng đăng nhập</p>
        <Button className="mt-4" asChild><Link href="/auth/login?redirect=/profile/privacy">Đăng nhập</Link></Button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      await privacyApi.requestDeletion({ requestType });
      setMessage("Yêu cầu xóa dữ liệu đã được ghi nhận. Admin sẽ xử lý trong thời gian sớm nhất.");
      if (requestType === "ALL") {
        setTimeout(async () => {
          await logout();
          router.push("/");
        }, 2000);
      }
    } catch (e: unknown) {
      setMessage((e as { message?: string })?.message || "Gửi yêu cầu thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell>
      <Link href="/profile" className="text-sm text-muted-foreground hover:underline">← Hồ sơ</Link>
      <PageHeader title="Quyền riêng tư & dữ liệu" className="mt-4" backHref="/profile" backLabel="Hồ sơ của tôi" />

      <Card>
        <CardHeader><CardTitle className="text-base">Yêu cầu xóa dữ liệu</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Loại yêu cầu</Label>
              <select
                value={requestType}
                onChange={(e) => setRequestType(e.target.value as typeof requestType)}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
              >
                <option value="RECOMMENDATION_HISTORY">Dữ liệu session / tư vấn</option>
                <option value="PHOTO_UPLOAD">Chỉ ảnh đã upload</option>
                <option value="ALL">Toàn bộ tài khoản</option>
              </select>
            </div>
            {message && <p className="text-sm text-muted-foreground">{message}</p>}
            <Button type="submit" disabled={loading}>
              {loading ? "Đang gửi..." : "Gửi yêu cầu"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </PageShell>
  );
}
