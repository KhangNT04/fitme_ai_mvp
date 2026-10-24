"use client";

import Link from "next/link";
import { ChevronRight, Heart, Ruler, Sparkles, Shirt, Bookmark, ImageIcon, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { FIT_PREFERENCES, GENDERS, SKIN_TONES } from "@/utils/constants";
import { hasMinimalBodyProfile } from "@/lib/profile-prefill";
import type { BodyProfile } from "@/types/user";
import type { ProfileSummary } from "@/types/profile";

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border/30 py-2.5 last:border-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:py-2">
      <dt className="text-xs text-muted-foreground sm:shrink-0 sm:text-sm">{label}</dt>
      <dd className="text-sm font-medium leading-snug text-foreground sm:min-w-0 sm:max-w-[65%] sm:text-right">
        {value}
      </dd>
    </div>
  );
}

function PreferenceLink({
  href,
  label,
  description,
  icon: Icon,
  accent,
  done,
}: {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  accent: string;
  done?: boolean;
}) {
  return (
    <Link
      href={href}
      className="surface-card group flex min-h-[52px] items-center gap-2.5 rounded-xl p-2.5 transition-all hover:border-primary/20 hover:shadow-md active:scale-[0.99] sm:min-h-[64px] sm:gap-4 sm:rounded-2xl sm:p-4"
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
      {done ? (
        <Badge variant="secondary" className="shrink-0 text-[10px]">
          Đã có
        </Badge>
      ) : (
        <ChevronRight
          className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      )}
    </Link>
  );
}

/**
 * The "Sở thích" tab: what FitMe already knows about the user, plus the shortcuts to change it.
 */
export function ProfilePreferencesTab({
  bodyProfile,
  summary,
}: {
  bodyProfile?: BodyProfile | null;
  summary: ProfileSummary;
}) {
  const hasBody = hasMinimalBodyProfile(bodyProfile);
  const fitLabel = FIT_PREFERENCES.find((f) => f.value === bodyProfile?.fitPreference)?.label;
  const skinLabel = SKIN_TONES.find((s) => s.value === bodyProfile?.skinTone)?.label;
  const genderLabel = GENDERS.find((g) => g.value === bodyProfile?.gender)?.label;

  return (
    <div className="space-y-3 sm:space-y-4">
      <section className="surface-card overflow-hidden rounded-xl sm:rounded-2xl">
        <div className="flex items-center justify-between gap-2 border-b border-border/40 px-3 py-2.5 sm:gap-3 sm:px-5 sm:py-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:h-8 sm:w-8">
              <Ruler className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
            </span>
            <h2 className="truncate font-display text-sm font-semibold text-foreground sm:text-base">
              Hồ sơ cơ thể
            </h2>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 shrink-0 rounded-full px-2.5 text-xs"
            asChild
          >
            <Link href="/profile/body" aria-label="Chỉnh sửa hồ sơ cơ thể">
              Chỉnh sửa
            </Link>
          </Button>
        </div>
        <div className="px-3 py-2.5 sm:px-5 sm:py-4">
          {hasBody && bodyProfile ? (
            <dl>
              <Detail label="Chiều cao" value={`${bodyProfile.heightCm} cm`} />
              <Detail label="Cân nặng" value={`${bodyProfile.weightKg} kg`} />
              {bodyProfile.age != null && <Detail label="Tuổi" value={`${bodyProfile.age}`} />}
              <Detail label="Giới tính" value={genderLabel ?? bodyProfile.gender} />
              {bodyProfile.fitPreference && (
                <Detail label="Form ưa thích" value={fitLabel ?? bodyProfile.fitPreference} />
              )}
              {bodyProfile.skinTone && (
                <Detail label="Tông da" value={skinLabel ?? bodyProfile.skinTone} />
              )}
              {bodyProfile.goals && bodyProfile.goals.length > 0 && (
                <Detail label="Mục tiêu" value={bodyProfile.goals.join(", ")} />
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
        </div>
      </section>

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

      <nav aria-label="Tùy chỉnh sở thích" className="grid gap-2 sm:grid-cols-2 sm:gap-3">
        <PreferenceLink
          href="/profile/style-preferences"
          label="Brand yêu thích"
          description="Tùy biến phối đồ (Premium)"
          icon={Heart}
          accent="bg-rose-500/10 text-rose-700"
          done={summary.brandPreferencesComplete}
        />
        <PreferenceLink
          href="/profile/style"
          label="Gu thời trang"
          description="Phong cách, dịp và màu sắc"
          icon={Sparkles}
          accent="bg-sky-500/10 text-sky-700"
          done={summary.styleProfileComplete}
        />
        <PreferenceLink
          href="/wardrobe"
          label="Tủ đồ"
          description="Quản lý item cá nhân"
          icon={Shirt}
          accent="bg-violet-500/10 text-violet-700"
          done={summary.wardrobeItems > 0}
        />
        <PreferenceLink
          href="/saved-outfits"
          label="Đã lưu"
          description="Outfit tư vấn & thử mặc"
          icon={Bookmark}
          accent="bg-pink-500/10 text-pink-700"
          done={summary.savedOutfits + summary.savedTryOns > 0}
        />
        <PreferenceLink
          href="/profile/gallery"
          label="Thư viện ảnh"
          description="Ảnh AI Try-on"
          icon={ImageIcon}
          accent="bg-amber-500/10 text-amber-700"
          done={summary.galleryImages > 0}
        />
        <PreferenceLink
          href="/community"
          label="Cộng đồng"
          description="Outfit đã chia sẻ & theo dõi"
          icon={Users}
          accent="bg-emerald-500/10 text-emerald-700"
          done={summary.communityPosts > 0}
        />
      </nav>
    </div>
  );
}
