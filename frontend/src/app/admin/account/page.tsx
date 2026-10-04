"use client";

import { PortalAdminPage } from "@/components/portal/PortalAdminPage";
import { ChangePasswordForm } from "@/components/account/ChangePasswordForm";
import { portalFormCardClass } from "@/lib/design-tokens";

export default function AdminAccountPage() {
  return (
    <PortalAdminPage title="Đổi mật khẩu" description="Cập nhật mật khẩu tài khoản quản trị.">
      <div className={portalFormCardClass}>
        <ChangePasswordForm className="max-w-md" />
      </div>
    </PortalAdminPage>
  );
}
