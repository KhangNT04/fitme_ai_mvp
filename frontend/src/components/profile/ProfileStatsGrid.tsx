"use client";

import Link from "next/link";
import { Image as ImageIcon, Bookmark, Shirt, Coins, Flame, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProfileSummary } from "@/types/profile";

interface StatItem {
  label: string;
  value: number;
  icon: LucideIcon;
  href?: string;
  accent: string;
}

/**
 * The headline numbers of the profile. Each tile links to the place the number belongs to,
 * so the user can act on what they see instead of hunting for the menu.
 */
export function ProfileStatsGrid({
  summary,
  className,
}: {
  summary: ProfileSummary;
  className?: string;
}) {
  const stats: StatItem[] = [
    {
      label: "Ảnh thử mặc",
      value: summary.galleryImages,
      icon: ImageIcon,
      href: "/profile/gallery",
      accent: "bg-pink-500/10 text-pink-600",
    },
    {
      label: "Đã lưu",
      value: summary.savedOutfits + summary.savedTryOns,
      icon: Bookmark,
      href: "/saved-outfits",
      accent: "bg-violet-500/10 text-violet-600",
    },
    {
      label: "Tủ đồ",
      value: summary.wardrobeItems,
      icon: Shirt,
      href: "/wardrobe",
      accent: "bg-sky-500/10 text-sky-600",
    },
    {
      label: "Điểm danh",
      value: summary.checkinStreak,
      icon: Flame,
      href: "/rewards",
      accent: "bg-orange-500/10 text-orange-600",
    },
    {
      label: "Fitken",
      value: summary.fitkenBalance,
      icon: Coins,
      href: "/rewards",
      accent: "bg-amber-500/10 text-amber-600",
    },
    {
      label: "Người theo dõi",
      value: summary.communityFollowers,
      icon: Users,
      href: "/community",
      accent: "bg-emerald-500/10 text-emerald-600",
    },
  ];

  return (
    <ul className={cn("grid grid-cols-3 gap-2 sm:gap-3 lg:grid-cols-6", className)}>
      {stats.map((stat) => {
        const Icon = stat.icon;
        const body = (
          <>
            <span
              className={cn(
                "mx-auto flex h-8 w-8 items-center justify-center rounded-lg sm:h-9 sm:w-9 sm:rounded-xl",
                stat.accent,
              )}
            >
              <Icon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" aria-hidden="true" />
            </span>
            <span className="mt-1.5 block font-display text-base font-bold leading-none text-foreground sm:mt-2 sm:text-lg">
              {stat.value.toLocaleString("vi-VN")}
            </span>
            <span className="mt-1 block truncate text-[10px] leading-tight text-muted-foreground sm:text-xs">
              {stat.label}
            </span>
          </>
        );

        return (
          <li key={stat.label} className="min-w-0">
            {stat.href ? (
              <Link
                href={stat.href}
                className="surface-card flex flex-col items-center rounded-xl px-1.5 py-2.5 text-center transition-all hover:border-primary/20 hover:shadow-md active:scale-[0.98] sm:rounded-2xl sm:px-2 sm:py-3"
              >
                {body}
              </Link>
            ) : (
              <div className="surface-card flex flex-col items-center rounded-xl px-1.5 py-2.5 text-center sm:rounded-2xl sm:px-2 sm:py-3">
                {body}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
