"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  Shirt,
  Bookmark,
  Shield,
  ChevronRight,
  Sparkles,
  UserRound,
  Ruler,
  Palette,
  LogOut,
  Pencil,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { useConsultationStore } from "@/stores/consultation-store";
import { useSavedProfiles } from "@/hooks/use-saved-profiles";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { PageShell } from "@/components/layout/PageShell";
import { CollapsingPageHeader } from "@/components/layout/CollapsingPageHeader";
import { consumerPageShellClass, consumerGuestPromptClass } from "@/lib/design-tokens";
import { FIT_PREFERENCES, GENDERS, RISK_LEVELS, SKIN_TONES } from "@/utils/constants";
import { mergeBodyProfiles, mergeStyleProfiles } from "@/lib/profile-merge";
import { hasMinimalBodyProfile, hasStyleProfileContent } from "@/lib/profile-prefill";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/auth";

const hubLinks = [
  {
    href: "/wardrobe",
    label: "Tủ đồ",
    description: "Quản lý item cá nhân",
    icon: Shirt,
    accent: "bg-violet-500/10 text-violet-700",
  },
  {
    href: "/saved-outfits",
    label: "Gợi ý đã lưu",
    description: "Outfit AI đã lưu",
    icon: Bookmark,
    accent: "bg-pink-500/10 text-pink-700",
  },
  {
    href: "/profile/privacy",
    label: "Quyền riêng tư",
    description: "Consent & xóa dữ liệu",
    icon: Shield,
    accent: "bg-emerald-500/10 text-emerald-700",
  },
] as const;

const ROLE_LABELS: Record<UserRole, string> = {
  USER: "Người dùng",
  BRAND: "Thương hiệu",
  ADMIN: "Quản trị",
};

function getInitials(name?: string | null): string {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function ProfileHubLink({
  href,
  label,
  description,
  icon: Icon,
  accent,
}: {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  accent: string;
}) {
  return (
    <Link
      href={href}
      className="surface-card group flex min-h-[52px] items-center gap-2.5 rounded-xl p-2.5 transition-all hover:border-primary/20 hover:shadow-md active:scale-[0.99] sm:min-h-[72px] sm:gap-4 sm:rounded-2xl sm:p-4"
    >
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-transform group-hover:scale-105 sm:h-11 sm:w-11 sm:rounded-xl",
          accent,
        )}
      >
        <Icon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-foreground">{label}</span>
        <span className="block truncate text-[11px] text-muted-foreground sm:text-xs">{description}</span>
      </span>
      <ChevronRight
        className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </Link>
  );
}

function ProfileDetail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border/30 py-2.5 last:border-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:py-2">
      <dt className="text-xs text-muted-foreground sm:shrink-0 sm:text-sm">{label}</dt>
      <dd className="text-sm font-medium leading-snug text-foreground sm:min-w-0 sm:max-w-[65%] sm:text-right">
        {value}
      </dd>
    </div>
  );
}

function ProfileSection({
  title,
  icon: Icon,
  editHref,
  editLabel,
  children,
  empty,
  className,
}: {
  title: string;
  icon: LucideIcon;
  editHref?: string;
  editLabel?: string;
  children: ReactNode;
  empty?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("surface-card overflow-hidden rounded-xl sm:rounded-2xl", className)}>
      <div className="flex items-center justify-between gap-2 border-b border-border/40 px-3 py-2.5 sm:gap-3 sm:px-5 sm:py-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:h-8 sm:w-8">
            <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
          </span>
          <h2 className="truncate font-display text-sm font-semibold text-foreground sm:text-base">{title}</h2>
        </div>
        {editHref && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 shrink-0 rounded-full px-2.5 text-xs sm:px-3"
            asChild
          >
            <Link href={editHref} aria-label={editLabel ?? "Chỉnh sửa"}>
              <Pencil className="h-3.5 w-3.5 sm:mr-1.5" aria-hidden="true" />
              <span className="hidden sm:inline">{editLabel ?? "Chỉnh sửa"}</span>
            </Link>
          </Button>
        )}
      </div>
      <div className="px-3 py-2.5 sm:px-5 sm:py-4">{empty ?? children}</div>
    </section>
  );
}

function GuestProfilePrompt() {
  return (
    <PageShell width="full" className={consumerPageShellClass}>
      <div className={consumerGuestPromptClass}>
        <div className="gradient-ai mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl shadow-md sm:h-14 sm:w-14 sm:rounded-2xl">
          <UserRound className="h-6 w-6 text-white sm:h-7 sm:w-7" aria-hidden="true" />
        </div>
        <h1 className="font-display text-xl font-bold text-foreground sm:text-2xl">Hồ sơ người dùng</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Đăng nhập để lưu profile cơ thể, gu thời trang và tủ đồ cá nhân.
        </p>
        <Button className="mt-5 min-h-11 w-full rounded-full sm:mt-6 sm:w-auto" asChild>
          <Link href="/auth/login?redirect=/profile">Đăng nhập</Link>
        </Button>
        <p className="mt-3 text-xs text-muted-foreground sm:mt-4">
          Chưa có tài khoản?{" "}
          <Link
            href="/auth/register?redirect=/profile"
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            Đăng ký
          </Link>
        </p>
      </div>
    </PageShell>
  );
}

export default function ProfilePage() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const draftBodyProfile = useConsultationStore((s) => s.draft.bodyProfile);
  const draftStyleProfile = useConsultationStore((s) => s.draft.styleProfile);
  const { bodyProfile: savedBodyProfile, styleProfile: savedStyleProfile, isLoading: profilesLoading } =
    useSavedProfiles({ enabled: isAuthenticated() });

  if (!isAuthenticated()) {
    return <GuestProfilePrompt />;
  }

  const bodyProfile = mergeBodyProfiles(savedBodyProfile, draftBodyProfile);
  const styleProfile = mergeStyleProfiles(savedStyleProfile, draftStyleProfile);
  const hasBody = hasMinimalBodyProfile(bodyProfile);
  const hasStyle = hasStyleProfileContent(styleProfile);

  const fitLabel = FIT_PREFERENCES.find((f) => f.value === bodyProfile?.fitPreference)?.label;
  const skinLabel = SKIN_TONES.find((s) => s.value === bodyProfile?.skinTone)?.label;
  const genderLabel = GENDERS.find((g) => g.value === bodyProfile?.gender)?.label;
  const riskLabel = RISK_LEVELS.find((r) => r.value === styleProfile?.riskLevel)?.label;
  const roleLabel = user?.role ? ROLE_LABELS[user.role] : "—";

  return (
    <PageShell width="full" className={consumerPageShellClass}>
      <CollapsingPageHeader
        title="Hồ sơ của tôi"
        subtitle="Quản lý tài khoản, profile AI và tiện ích cá nhân"
        backHref="/"
        backLabel="Trang chủ"
      />

      <div className="space-y-3 sm:space-y-4">
        <section className="surface-card relative overflow-hidden rounded-xl p-3 sm:rounded-2xl sm:p-5">
          <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-primary/10 blur-2xl sm:h-32 sm:w-32" />
          <div className="relative flex items-center gap-3 sm:gap-4">
            <div className="gradient-ai flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-base font-bold text-white shadow-md sm:h-16 sm:w-16 sm:rounded-2xl sm:text-xl">
              {getInitials(user?.fullName)}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate font-display text-base font-bold text-foreground sm:text-xl">
                {user?.fullName ?? "Người dùng FitMe"}
              </h2>
              <p className="mt-0.5 truncate text-xs text-muted-foreground sm:text-sm">{user?.email}</p>
              <div className="mt-1.5 flex flex-wrap gap-1 sm:mt-2 sm:gap-1.5">
                <Badge variant="secondary" className="px-2 py-0 text-[10px] sm:text-xs">
                  {roleLabel}
                </Badge>
                {hasBody && bodyProfile && (
                  <Badge variant="outline" className="px-2 py-0 text-[10px] sm:text-xs">
                    {bodyProfile.heightCm} cm · {bodyProfile.weightKg} kg
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </section>

        <nav aria-label="Tiện ích hồ sơ" className="grid gap-2 sm:grid-cols-3 sm:gap-3">
          {hubLinks.map((item) => (
            <ProfileHubLink key={item.href} {...item} />
          ))}
        </nav>

        {profilesLoading ? (
          <LoadingSkeleton type="card" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
            <ProfileSection
              title="Hồ sơ cơ thể"
              icon={Ruler}
              editHref="/profile/body"
            >
              {hasBody && bodyProfile ? (
                <dl>
                  <ProfileDetail label="Chiều cao" value={`${bodyProfile.heightCm} cm`} />
                  <ProfileDetail label="Cân nặng" value={`${bodyProfile.weightKg} kg`} />
                  <ProfileDetail label="Giới tính" value={genderLabel ?? bodyProfile.gender} />
                  {bodyProfile.fitPreference && (
                    <ProfileDetail label="Form ưa thích" value={fitLabel ?? bodyProfile.fitPreference} />
                  )}
                  {bodyProfile.skinTone && (
                    <ProfileDetail label="Tông da" value={skinLabel ?? bodyProfile.skinTone} />
                  )}
                  {bodyProfile.goals && bodyProfile.goals.length > 0 && (
                    <ProfileDetail label="Mục tiêu" value={bodyProfile.goals.join(", ")} />
                  )}
                </dl>
              ) : (
                <div className="py-1 text-center sm:py-2">
                  <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
                    Chưa có số đo — hoàn thành tư vấn AI để gợi ý size chính xác hơn.
                  </p>
                  <Button variant="ai" size="sm" className="mt-3 h-9 w-full rounded-full sm:w-auto" asChild>
                    <Link href="/profile/body">
                      <Sparkles className="mr-1.5 h-4 w-4" aria-hidden="true" />
                      Thiết lập hồ sơ cơ thể
                    </Link>
                  </Button>
                </div>
              )}
            </ProfileSection>

            <ProfileSection
              title="Gu thời trang"
              icon={Palette}
              editHref="/profile/style"
            >
              {hasStyle ? (
                <dl>
                  {styleProfile.primaryStyle && (
                    <ProfileDetail label="Phong cách chính" value={styleProfile.primaryStyle} />
                  )}
                  {styleProfile.secondaryStyles && styleProfile.secondaryStyles.length > 0 && (
                    <ProfileDetail label="Phong cách phụ" value={styleProfile.secondaryStyles.join(", ")} />
                  )}
                  {styleProfile.riskLevel && (
                    <ProfileDetail label="Mức rủi ro" value={riskLabel ?? styleProfile.riskLevel} />
                  )}
                  {styleProfile.preferredColors && styleProfile.preferredColors.length > 0 && (
                    <ProfileDetail label="Màu ưa thích" value={styleProfile.preferredColors.join(", ")} />
                  )}
                  {styleProfile.avoidedColors && styleProfile.avoidedColors.length > 0 && (
                    <ProfileDetail label="Màu tránh" value={styleProfile.avoidedColors.join(", ")} />
                  )}
                </dl>
              ) : (
                <div className="py-1 text-center sm:py-2">
                  <p className="text-xs text-muted-foreground sm:text-sm">Chưa thiết lập gu thời trang.</p>
                  <Button variant="outline" size="sm" className="mt-3 h-9 w-full rounded-full sm:w-auto" asChild>
                    <Link href="/profile/style">Thiết lập gu</Link>
                  </Button>
                </div>
              )}
            </ProfileSection>
          </div>
        )}

        {bodyProfile?.measurements &&
          Object.values(bodyProfile.measurements).some((v) => v != null) && (
            <section className="surface-card rounded-xl p-3 sm:rounded-2xl sm:p-5">
              <h2 className="font-display text-sm font-semibold text-foreground">Số đo chi tiết</h2>
              <div className="mt-2 flex flex-wrap gap-1.5 sm:mt-3 sm:gap-2">
                {bodyProfile.measurements.chestCm != null && (
                  <Badge variant="outline" className="text-[10px] sm:text-xs">
                    Ngực {bodyProfile.measurements.chestCm} cm
                  </Badge>
                )}
                {bodyProfile.measurements.waistCm != null && (
                  <Badge variant="outline" className="text-[10px] sm:text-xs">
                    Eo {bodyProfile.measurements.waistCm} cm
                  </Badge>
                )}
                {bodyProfile.measurements.hipCm != null && (
                  <Badge variant="outline" className="text-[10px] sm:text-xs">
                    Hông {bodyProfile.measurements.hipCm} cm
                  </Badge>
                )}
                {bodyProfile.measurements.shoulderWidthCm != null && (
                  <Badge variant="outline" className="text-[10px] sm:text-xs">
                    Vai {bodyProfile.measurements.shoulderWidthCm} cm
                  </Badge>
                )}
                {bodyProfile.measurements.inseamCm != null && (
                  <Badge variant="outline" className="text-[10px] sm:text-xs">
                    Sườn trong {bodyProfile.measurements.inseamCm} cm
                  </Badge>
                )}
              </div>
            </section>
          )}

        <ProfileSection title="Thông tin tài khoản" icon={UserRound}>
          <dl>
            <ProfileDetail label="Họ tên" value={user?.fullName ?? "—"} />
            <ProfileDetail label="Email" value={user?.email ?? "—"} />
            <ProfileDetail label="Vai trò" value={roleLabel} />
          </dl>
        </ProfileSection>

        <div className="pb-1 pt-0.5">
          <Button
            variant="outline"
            className="min-h-11 w-full rounded-full border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive sm:w-auto"
            onClick={() => logout()}
          >
            <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
            Đăng xuất
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
