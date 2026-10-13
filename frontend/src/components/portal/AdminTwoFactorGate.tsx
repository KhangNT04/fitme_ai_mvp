"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ShieldAlert } from "lucide-react";
import { authApi } from "@/services/auth-api";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { TWO_FACTOR_STATUS_KEY } from "@/components/account/TwoFactorCard";
import { portalFormCardClass } from "@/lib/design-tokens";

const ACCOUNT_PATH = "/admin/account";

/** Replaces admin pages with enrollment / re-login guidance while the backend requires a 2FA session. */
export function AdminTwoFactorGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = useAuthStore((s) => s.user?.role === "ADMIN");
  const logout = useAuthStore((s) => s.logout);
  const { data: status } = useQuery({
    queryKey: TWO_FACTOR_STATUS_KEY,
    queryFn: authApi.getTwoFactorStatus,
    enabled: isAdmin,
    staleTime: 60_000,
  });

  if (!status?.required || status.sessionVerified || pathname === ACCOUNT_PATH) {
    return <>{children}</>;
  }

  return (
    <div className={portalFormCardClass}>
      <div className="flex max-w-xl items-start gap-3">
        <ShieldAlert className="mt-0.5 h-6 w-6 shrink-0 text-amber-600" />
        <div className="space-y-3">
          <h2 className="font-semibold">Cần xác thực 2 bước</h2>
          {status.enabled ? (
            <>
              <p className="text-sm text-muted-foreground">
                Phiên này đăng nhập bằng mật khẩu nhưng chưa nhập mã xác thực. Đăng nhập lại để nhập mã 6 số từ
                ứng dụng Authenticator.
              </p>
              <Button
                type="button"
                onClick={async () => {
                  await logout();
                  router.push("/admin/login");
                }}
              >
                Đăng nhập lại
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Trang quản trị chỉ mở cho tài khoản đã bật xác thực 2 bước. Bật 2FA (mất khoảng 1 phút) rồi tiếp tục.
              </p>
              <Button asChild>
                <Link href={ACCOUNT_PATH}>Bật xác thực 2 bước</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
