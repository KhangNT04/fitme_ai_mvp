"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { brandApi } from "@/services/brand-api";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { AuthCardShell } from "@/components/layout/AuthCardShell";
import { brandStatusLabel } from "@/lib/status-labels";

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

  if (!isAuthenticated()) return null;

  if (isLoading) {
    return (
      <AuthCardShell title="Trạng thái đơn Brand" backHref="/brand/onboarding" backLabel="Đăng ký Brand">
        <LoadingSkeleton type="card" />
      </AuthCardShell>
    );
  }

  const brand = data?.brand;
  const status = brand?.status;

  return (
    <AuthCardShell
      title="Trạng thái đơn Brand"
      backHref="/brand/onboarding"
      backLabel="Đăng ký Brand"
      footer={
        <p className="mt-4 text-center text-sm text-muted-foreground">
          <Link href="/" className="hover:underline">
            Về trang chủ
          </Link>
        </p>
      }
    >
      <div className="space-y-4">
        {!data?.hasApplication ? (
          <>
            <p className="text-sm text-muted-foreground">Bạn chưa gửi đơn đăng ký brand.</p>
            <Button asChild className="w-full">
              <Link href="/brand/onboarding">Gửi đơn đăng ký</Link>
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">{data.message}</p>
            <div className="space-y-2 rounded-xl border border-border/60 bg-muted/30 p-4 text-sm">
              <p>
                <span className="text-muted-foreground">Thương hiệu:</span>{" "}
                <span className="font-medium">{brand?.name}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Email:</span>{" "}
                <span className="font-medium">{brand?.contactEmail}</span>
              </p>
              <p className="flex flex-wrap items-center gap-2">
                <span className="text-muted-foreground">Trạng thái:</span>
                <Badge variant="outline">{brandStatusLabel(status)}</Badge>
              </p>
            </div>
            {status === "APPROVED" && (
              <div className="space-y-3">
                <p className="text-sm text-green-700">
                  Brand đã được duyệt. Vui lòng đăng xuất và đăng nhập lại để truy cập portal.
                </p>
                <Button
                  className="w-full"
                  onClick={async () => {
                    await logout();
                    router.push("/brand/login");
                  }}
                >
                  Đăng xuất và đăng nhập lại
                </Button>
              </div>
            )}
            {status === "REJECTED" && (
              <Button className="w-full" asChild>
                <Link href="/brand/onboarding">Gửi lại đơn</Link>
              </Button>
            )}
          </>
        )}
      </div>
    </AuthCardShell>
  );
}
