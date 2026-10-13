"use client";

import { PortalAdminPage } from "@/components/portal/PortalAdminPage";
import { ChangePasswordForm } from "@/components/account/ChangePasswordForm";
import { TwoFactorCard } from "@/components/account/TwoFactorCard";
import { portalFormCardClass } from "@/lib/design-tokens";

export default function AdminAccountPage() {
  return (
    <PortalAdminPage
      title="Tài khoản & bảo mật"
      description="Xác thực 2 bước và mật khẩu của tài khoản quản trị."
    >
      <div className="space-y-6">
        <div className={portalFormCardClass}>
          <TwoFactorCard className="max-w-xl" />
        </div>
        <div className={portalFormCardClass}>
          <h2 className="mb-4 font-semibold">Đổi mật khẩu</h2>
          <ChangePasswordForm className="max-w-md" />
        </div>
      </div>
    </PortalAdminPage>
  );
}
