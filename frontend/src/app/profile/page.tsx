"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { profileApi } from "@/services/profile-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { FIT_PREFERENCES, SKIN_TONES } from "@/utils/constants";

export default function ProfilePage() {
  const { user, isAuthenticated, logout } = useAuthStore();

  const { data: bodyProfile, isLoading: bodyLoading } = useQuery({
    queryKey: ["body-profile"],
    queryFn: () => profileApi.getBodyProfile(),
    enabled: isAuthenticated(),
  });

  const { data: styleProfile, isLoading: styleLoading } = useQuery({
    queryKey: ["style-profile"],
    queryFn: () => profileApi.getStyleProfile(),
    enabled: isAuthenticated(),
  });

  if (!isAuthenticated()) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Hồ sơ người dùng</h1>
        <p className="mt-2 text-muted-foreground">Đăng nhập để lưu profile và tủ đồ</p>
        <Button className="mt-6" asChild>
          <Link href="/auth/login?redirect=/profile">Đăng nhập</Link>
        </Button>
      </div>
    );
  }

  const fitLabel = FIT_PREFERENCES.find((f) => f.value === bodyProfile?.fitPreference)?.label;
  const skinLabel = SKIN_TONES.find((s) => s.value === bodyProfile?.skinTone)?.label;

  return (
    <PageShell>
      <PageHeader title="Hồ sơ của tôi" backHref="/" backLabel="Trang chủ" />

      <Card>
        <CardHeader><CardTitle className="text-base">Thông tin tài khoản</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><strong>Họ tên:</strong> {user?.fullName}</p>
          <p><strong>Email:</strong> {user?.email}</p>
          <p><strong>Vai trò:</strong> {user?.role}</p>
        </CardContent>
      </Card>

      {bodyLoading || styleLoading ? (
        <div className="mt-6"><LoadingSkeleton type="card" /></div>
      ) : (
        <>
          <Card className="mt-6">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Body profile</CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link href="/ai/body-profile">Chỉnh sửa</Link>
              </Button>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              {bodyProfile ? (
                <>
                  <p><strong>Chiều cao:</strong> {bodyProfile.heightCm} cm</p>
                  <p><strong>Cân nặng:</strong> {bodyProfile.weightKg} kg</p>
                  <p><strong>Form ưa thích:</strong> {fitLabel ?? bodyProfile.fitPreference}</p>
                  <p><strong>Tông da:</strong> {skinLabel ?? bodyProfile.skinTone}</p>
                  {bodyProfile.measurements && (
                    <div className="mt-2 pt-2 border-t space-y-1">
                      <p className="font-medium">Số đo chi tiết</p>
                      {bodyProfile.measurements.chestCm != null && <p>Ngực: {bodyProfile.measurements.chestCm} cm</p>}
                      {bodyProfile.measurements.waistCm != null && <p>Eo: {bodyProfile.measurements.waistCm} cm</p>}
                      {bodyProfile.measurements.hipCm != null && <p>Hông: {bodyProfile.measurements.hipCm} cm</p>}
                      {bodyProfile.measurements.shoulderWidthCm != null && <p>Vai: {bodyProfile.measurements.shoulderWidthCm} cm</p>}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">Chưa cập nhật — <Link href="/ai/body-profile" className="underline">Bắt đầu tư vấn</Link></p>
              )}
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Style profile</CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link href="/ai/style-profile">Chỉnh sửa</Link>
              </Button>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              {styleProfile ? (
                <>
                  <p><strong>Phong cách chính:</strong> {styleProfile.primaryStyle}</p>
                  <p><strong>Mức rủi ro:</strong> {styleProfile.riskLevel}</p>
                  <p><strong>Màu ưa thích:</strong> {styleProfile.preferredColors?.join(", ")}</p>
                </>
              ) : (
                <p className="text-muted-foreground">Chưa cập nhật</p>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <Button variant="outline" asChild><Link href="/wardrobe">Tủ đồ</Link></Button>
        <Button variant="outline" asChild><Link href="/saved-outfits">Gợi ý đã lưu</Link></Button>
        <Button variant="outline" asChild><Link href="/profile/privacy">Quyền riêng tư</Link></Button>
        <Button variant="destructive" onClick={() => logout()}>Đăng xuất</Button>
      </div>
    </PageShell>
  );
}
