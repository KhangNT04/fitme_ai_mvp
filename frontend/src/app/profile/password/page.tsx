"use client";

import { PageShell } from "@/components/layout/PageShell";
import { CollapsingPageHeader } from "@/components/layout/CollapsingPageHeader";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { PageSuspense } from "@/components/common/PageSuspense";
import { LoginRequiredNotice } from "@/components/common/LoginRequiredNotice";
import { ChangePasswordForm } from "@/components/account/ChangePasswordForm";
import { useRequireLogin } from "@/hooks/use-require-login";
import { consumerPageShellClass } from "@/lib/design-tokens";

export default function ChangePasswordPage() {
  return (
    <PageSuspense>
      <ChangePasswordContent />
    </PageSuspense>
  );
}

function ChangePasswordContent() {
  const { ready, authed } = useRequireLogin();

  return (
    <PageShell width="full" className={consumerPageShellClass}>
      <CollapsingPageHeader
        title="Đổi mật khẩu"
        subtitle="Bảo vệ tài khoản FitMe của bạn"
        backHref="/profile"
        backLabel="Hồ sơ"
        showMobileBack
      />
      {!ready ? (
        <LoadingSkeleton type="card" count={1} />
      ) : !authed ? (
        <LoginRequiredNotice next="/profile/password" />
      ) : (
        <div className="surface-card mx-auto max-w-md rounded-2xl p-5 sm:p-6">
          <ChangePasswordForm />
        </div>
      )}
    </PageShell>
  );
}
