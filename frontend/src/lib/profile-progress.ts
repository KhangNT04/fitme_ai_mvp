import type { ProfileSummary } from "@/types/profile";

export type ProfileStepKey =
  | "BODY_PROFILE"
  | "MEASUREMENTS"
  | "STYLE_PROFILE"
  | "EMAIL_VERIFIED"
  | "TWO_FACTOR";

export interface ProfileStep {
  key: ProfileStepKey;
  label: string;
  description: string;
  href: string;
  cta: string;
  done: boolean;
}

/** The checklist shown in the profile progress card, in the order the user should work through it. */
export function profileChecklist(summary: ProfileSummary): ProfileStep[] {
  return [
    {
      key: "BODY_PROFILE",
      label: "Số đo cơ thể",
      description: "Giúp AI chọn size chính xác hơn",
      href: "/profile/body",
      cta: "Thiết lập",
      done: summary.bodyProfileComplete,
    },
    {
      key: "MEASUREMENTS",
      label: "Số đo chi tiết",
      description: "Ngực, eo, hông, vai, sườn trong",
      href: "/profile/body",
      cta: "Bổ sung",
      done: summary.measurementsComplete,
    },
    {
      key: "STYLE_PROFILE",
      label: "Gu thời trang",
      description: "Phong cách và dịp bạn thích",
      href: "/profile/style",
      cta: "Thiết lập",
      done: summary.styleProfileComplete,
    },
    {
      key: "EMAIL_VERIFIED",
      label: "Xác thực email",
      description: "Bảo vệ tài khoản và nhận thông báo",
      href: "/profile/account",
      cta: "Xác thực",
      done: summary.emailVerified,
    },
    {
      key: "TWO_FACTOR",
      label: "Bảo mật 2 lớp",
      description: "Thêm mã xác thực khi đăng nhập",
      href: "/profile/account",
      cta: "Bật",
      done: summary.twoFactorEnabled,
    },
  ];
}

/** Percentage (0..100) of the checklist that is done, for the progress bar. */
export function profileCompletionPercent(summary: ProfileSummary): number {
  const steps = profileChecklist(summary);
  if (steps.length === 0) return 0;
  const done = steps.filter((step) => step.done).length;
  return Math.round((done / steps.length) * 100);
}

/** The step to nudge the user towards next, or null when the profile is complete. */
export function nextProfileStep(summary: ProfileSummary): ProfileStep | null {
  return profileChecklist(summary).find((step) => !step.done) ?? null;
}
