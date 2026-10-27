"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { LogOut, UserRound, Sparkles, Gift } from "lucide-react";
import { profileApi, buildProfileSummaryFallback, PROFILE_SUMMARY_QUERY_KEY } from "@/services/profile-api";
import { useAuthStore } from "@/stores/auth-store";
import { useSavedProfiles } from "@/hooks/use-saved-profiles";
import { Button } from "@/components/ui/button";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { PageShell } from "@/components/layout/PageShell";
import { CollapsingPageHeader } from "@/components/layout/CollapsingPageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileHero } from "@/components/profile/ProfileHero";
import { ProfileProgressCard } from "@/components/profile/ProfileProgressCard";
import { ProfileStatsGrid } from "@/components/profile/ProfileStatsGrid";
import { ProfilePreferencesTab } from "@/components/profile/ProfilePreferencesTab";
import { ProfileAccountTab } from "@/components/profile/ProfileAccountTab";
import { ProfileMyPostsTab } from "@/components/profile/ProfileMyPostsTab";
import { consumerPageShellClass, consumerGuestPromptClass } from "@/lib/design-tokens";
import { hasMinimalBodyProfile } from "@/lib/profile-prefill";

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
  const { bodyProfile, isLoading: profilesLoading } = useSavedProfiles({
    enabled: isAuthenticated(),
  });
  const [tab, setTab] = useState("overview");

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: PROFILE_SUMMARY_QUERY_KEY,
    queryFn: async () => {
      try {
        return await profileApi.getSummary();
      } catch {
        // The aggregated endpoint may be missing on an older backend; rebuild it from the
        // individual endpoints so the profile hub still renders real numbers.
        return buildProfileSummaryFallback();
      }
    },
    enabled: isAuthenticated(),
    staleTime: 30_000,
    retry: false,
  });

  if (!isAuthenticated()) {
    return <GuestProfilePrompt />;
  }

  const hasBody = hasMinimalBodyProfile(bodyProfile);
  const bodyBadge = hasBody && bodyProfile ? `${bodyProfile.heightCm} cm · ${bodyProfile.weightKg} kg` : null;

  return (
    <PageShell width="full" className={consumerPageShellClass}>
      <CollapsingPageHeader
        title="Hồ sơ của tôi"
        subtitle="Số liệu, sở thích và bảo mật tài khoản"
        backHref="/"
        backLabel="Trang chủ"
      />

      <div className="space-y-3 sm:space-y-4">
        <ProfileHero
          email={user?.email}
          displayName={user?.fullName}
          role={user?.role}
          fitkenBalance={summary?.fitkenBalance}
          bodyBadge={bodyBadge}
        />

        {summaryLoading || !summary ? (
          <LoadingSkeleton type="card" />
        ) : (
          <>
            <ProfileStatsGrid summary={summary} />
            <ProfileProgressCard summary={summary} />
          </>
        )}

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid h-auto w-full grid-cols-4 rounded-full p-1">
            <TabsTrigger value="overview" className="rounded-full text-xs sm:text-sm">
              Tổng quan
            </TabsTrigger>
            <TabsTrigger value="preferences" className="rounded-full text-xs sm:text-sm">
              Sở thích
            </TabsTrigger>
            <TabsTrigger value="posts" className="rounded-full text-xs sm:text-sm">
              Bài của tôi
            </TabsTrigger>
            <TabsTrigger value="account" className="rounded-full text-xs sm:text-sm">
              Tài khoản
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-3 sm:mt-4">
            <div className="space-y-3 sm:space-y-4">
              <section className="surface-card rounded-xl p-3 sm:rounded-2xl sm:p-5">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:h-8 sm:w-8">
                    <Gift className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
                  </span>
                  <h2 className="truncate font-display text-sm font-semibold text-foreground sm:text-base">
                    Nhiệm vụ & Fitken
                  </h2>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Điểm danh hằng ngày, chia sẻ outfit và viết đánh giá để nhận thưởng Fitken.
                </p>
                <Button asChild size="sm" variant="ai" className="mt-3 w-full rounded-full">
                  <Link href="/rewards">
                    <Sparkles className="mr-1.5 h-4 w-4" aria-hidden="true" />
                    Nhận thưởng
                  </Link>
                </Button>
              </section>

              <section className="surface-card rounded-xl p-3 sm:rounded-2xl sm:p-5">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:h-8 sm:w-8">
                    <UserRound className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
                  </span>
                  <h2 className="truncate font-display text-sm font-semibold text-foreground sm:text-base">
                    Hoạt động gần đây
                  </h2>
                </div>
                <dl className="mt-2 space-y-1.5 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">Ảnh thử mặc</dt>
                    <dd className="font-medium text-foreground">{summary?.galleryImages ?? 0}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">Outfit đã lưu</dt>
                    <dd className="font-medium text-foreground">{summary?.savedOutfits ?? 0}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">Outfit đã chia sẻ</dt>
                    <dd className="font-medium text-foreground">{summary?.communityPosts ?? 0}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">Fitken tháng này</dt>
                    <dd className="font-medium text-foreground">
                      +{summary?.fitkenEarnedThisMonth ?? 0}
                    </dd>
                  </div>
                </dl>
              </section>
            </div>
          </TabsContent>

          <TabsContent value="preferences" className="mt-3 sm:mt-4">
            {profilesLoading ? (
              <LoadingSkeleton type="card" />
            ) : (
              <ProfilePreferencesTab bodyProfile={bodyProfile} summary={summary!} />
            )}
          </TabsContent>

          <TabsContent value="posts" className="mt-3 sm:mt-4">
            <ProfileMyPostsTab />
          </TabsContent>

          <TabsContent value="account" className="mt-3 sm:mt-4">
            <ProfileAccountTab />
          </TabsContent>
        </Tabs>

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
