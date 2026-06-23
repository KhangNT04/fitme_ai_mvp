"use client";

import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProfilePage() {
  const { user, isAuthenticated, clearAuth } = useAuthStore();

  if (!isAuthenticated()) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Hồ sơ người dùng</h1>
        <p className="mt-2 text-stone-500">Đăng nhập để lưu profile và tủ đồ</p>
        <Button className="mt-6" asChild>
          <Link href="/auth/login">Đăng nhập</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-stone-900">Hồ sơ của tôi</h1>

      <Card className="mt-8">
        <CardHeader><CardTitle className="text-base">Thông tin tài khoản</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><strong>Họ tên:</strong> {user?.fullName}</p>
          <p><strong>Email:</strong> {user?.email}</p>
          <p><strong>Trạng thái:</strong> {user?.emailVerified ? "Đã xác minh" : "Chưa xác minh"}</p>
        </CardContent>
      </Card>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button variant="outline" asChild><Link href="/wardrobe">Tủ đồ</Link></Button>
        <Button variant="outline" asChild><Link href="/saved-outfits">Gợi ý đã lưu</Link></Button>
        <Button variant="destructive" onClick={clearAuth}>Đăng xuất</Button>
      </div>
    </div>
  );
}
