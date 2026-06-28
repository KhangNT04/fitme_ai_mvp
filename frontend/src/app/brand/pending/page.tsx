"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { brandApi } from "@/services/brand-api";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";

export default function BrandPendingPage() {
  const router = useRouter();
  const { isAuthenticated, logout } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ["brand-application"],
    queryFn: () => brandApi.getMyApplication(),
    enabled: isAuthenticated(),
  });

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/auth/login?redirect=/brand/pending");
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (data?.brand?.status === "APPROVED") {
      // JWT cũ vẫn là USER — cần đăng nhập lại
    }
  }, [data]);

  if (!isAuthenticated()) return null;

  if (isLoading) {
    return (
      <PageShell width="medium" className="py-12">
        <LoadingSkeleton type="card" />
      </PageShell>
    );
  }

  const brand = data?.brand;
  const status = brand?.status;

  return (
    <PageShell width="medium" className="py-12">
      <PageHeader title="Trạng thái đơn Brand" backHref="/brand/onboarding" backLabel="Đăng ký Brand" />

      <Card>
        <CardContent className="space-y-4 pt-6">
          {!data?.hasApplication ? (
            <>
              <p className="text-sm text-muted-foreground">Bạn chưa gửi đơn đăng ký brand.</p>
              <Button asChild><Link href="/brand/onboarding">Gửi đơn đăng ký</Link></Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">{data.message}</p>
              <div className="rounded-2xl border border-border/60 p-4 text-sm space-y-2">
                <p><strong>Thương hiệu:</strong> {brand?.name}</p>
                <p><strong>Email:</strong> {brand?.contactEmail}</p>
                <p className="flex items-center gap-2">
                  <strong>Trạng thái:</strong>
                  <Badge variant="outline">{status}</Badge>
                </p>
              </div>
              {status === "APPROVED" && (
                <div className="space-y-2">
                  <p className="text-sm text-green-700">
                    Brand đã được duyệt. Vui lòng đăng xuất và đăng nhập lại để truy cập portal.
                  </p>
                  <Button onClick={async () => { await logout(); router.push("/brand/login"); }}>
                    Đăng xuất và đăng nhập lại
                  </Button>
                </div>
              )}
              {status === "PENDING" && (
                <Button variant="outline" asChild><Link href="/">Về trang chủ</Link></Button>
              )}
              {status === "REJECTED" && (
                <Button asChild><Link href="/brand/onboarding">Gửi lại đơn</Link></Button>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
