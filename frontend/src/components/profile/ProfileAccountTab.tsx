"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { KeyRound, Shield, ShieldCheck, Trash2, UserRound, Wallet, Sparkles } from "lucide-react";
import { authApi } from "@/services/auth-api";
import { fitkenApi } from "@/services/fitken-api";
import { useAuthStore } from "@/stores/auth-store";
import { usePricingVisibility } from "@/hooks/use-pricing-visibility";
import { TwoFactorCard } from "@/components/account/TwoFactorCard";
import { ChangeEmailSection } from "@/components/account/ChangeEmailSection";
import { DeleteAccountSection } from "@/components/privacy/DeleteAccountSection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { UserRole } from "@/types/auth";

const ROLE_LABELS: Record<UserRole, string> = {
  USER: "Người dùng",
  BRAND: "Thương hiệu",
  ADMIN: "Quản trị",
};

function AccountRow({
  icon: Icon,
  label,
  value,
  href,
  actionLabel,
}: {
  icon: typeof UserRound;
  label: string;
  value?: string;
  href: string;
  actionLabel?: string;
}) {
  return (
    <li className="flex items-center gap-3 border-b border-border/30 py-2.5 last:border-0">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-foreground">{label}</span>
        {value && <span className="block truncate text-xs text-muted-foreground">{value}</span>}
      </span>
      <Button asChild variant="outline" size="sm" className="h-8 shrink-0 rounded-full px-2.5 text-xs">
        <Link href={href}>{actionLabel ?? "Quản lý"}</Link>
      </Button>
    </li>
  );
}

/** The "Tài khoản" tab: identity, plan, security and data controls. */
export function ProfileAccountTab() {
  const user = useAuthStore((s) => s.user);
  const { showPaid } = usePricingVisibility();
  const { data: wallet } = useQuery({
    queryKey: ["fitken-wallet"],
    queryFn: () => fitkenApi.getWallet(),
    staleTime: 30_000,
  });
  const { data: twoFactor } = useQuery({
    queryKey: ["two-factor-status"],
    queryFn: authApi.getTwoFactorStatus,
    staleTime: 60_000,
  });

  return (
    <div className="space-y-3 sm:space-y-4">
      <section className="surface-card overflow-hidden rounded-xl sm:rounded-2xl">
        <div className="flex items-center gap-2 border-b border-border/40 px-3 py-2.5 sm:px-5 sm:py-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:h-8 sm:w-8">
            <UserRound className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
          </span>
          <h2 className="truncate font-display text-sm font-semibold text-foreground sm:text-base">
            Thông tin tài khoản
          </h2>
        </div>
        <ul className="px-3 sm:px-5">
          <li className="flex items-center gap-3 border-b border-border/30 py-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <UserRound className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-foreground">
                {user?.fullName ?? "—"}
              </span>
              <span className="block truncate text-xs text-muted-foreground">{user?.email ?? "—"}</span>
            </span>
            <Badge variant="secondary" className="shrink-0">
              {user?.role ? ROLE_LABELS[user.role] : "Người dùng"}
            </Badge>
          </li>
          {showPaid && (
            <AccountRow
              icon={Wallet}
              label="Gói sử dụng"
              value={
                wallet
                  ? `${wallet.plan === "PREMIUM" ? "Premium" : "Free"} · ${wallet.balance} Fitken`
                  : "Đang tải..."
              }
              href="/pricing"
              actionLabel="Nâng cấp"
            />
          )}
          <AccountRow
            icon={KeyRound}
            label="Mật khẩu"
            value="Đổi mật khẩu định kỳ để bảo vệ tài khoản"
            href="/profile/password"
          />
          <AccountRow
            icon={Shield}
            label="Quyền riêng tư"
            value="Consent, xóa dữ liệu, bật/tắt chia sẻ cộng đồng"
            href="/profile/privacy"
          />
        </ul>
      </section>

      <section className="surface-card overflow-hidden rounded-xl sm:rounded-2xl">
        <div className="flex items-center gap-2 border-b border-border/40 px-3 py-2.5 sm:px-5 sm:py-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:h-8 sm:w-8">
            <ShieldCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
          </span>
          <h2 className="truncate font-display text-sm font-semibold text-foreground sm:text-base">
            Bảo mật tài khoản
          </h2>
          {twoFactor?.enabled && (
            <Badge variant="success" className="ml-auto shrink-0">
              2FA đang bật
            </Badge>
          )}
        </div>
        <div className="space-y-3 p-3 sm:p-5">
          <TwoFactorCard />
          {!twoFactor?.enabled && (
            <p className="text-xs text-muted-foreground">
              Bật xác thực 2 bước để tài khoản an toàn hơn kể cả khi mật khẩu bị lộ.
            </p>
          )}
          <div className="border-t border-border/30 pt-3">
            <ChangeEmailSection />
          </div>
        </div>
      </section>

      {showPaid && (
        <section className="surface-card rounded-xl p-3 sm:rounded-2xl sm:p-5">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:h-8 sm:w-8">
              <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
            </span>
            <h2 className="truncate font-display text-sm font-semibold text-foreground sm:text-base">
              Nâng cấp trải nghiệm
            </h2>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            FitMe Premium mở khóa tùy biến phối đồ theo brand yêu thích và gợi ý sâu hơn.
          </p>
          <Button asChild size="sm" variant="ai" className="mt-3 w-full rounded-full">
            <Link href="/pricing">Xem gói Premium</Link>
          </Button>
        </section>
      )}

      <section className="surface-card overflow-hidden rounded-xl sm:rounded-2xl">
        <div className="flex items-center gap-2 border-b border-border/40 px-3 py-2.5 sm:gap-3 sm:px-5 sm:py-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive sm:h-8 sm:w-8">
            <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
          </span>
          <h2 className="truncate font-display text-sm font-semibold text-foreground sm:text-base">
            Xoá tài khoản
          </h2>
        </div>
        <div className="p-3 sm:p-5">
          <DeleteAccountSection />
        </div>
      </section>
    </div>
  );
}
