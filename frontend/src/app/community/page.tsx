"use client";

import { useState } from "react";
import Link from "next/link";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TrendingUp, Clock, FlaskConical } from "lucide-react";
import { communityApi, nextCommunityPage } from "@/services/community-api";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "@/stores/toast-store";
import { QuickShareDialog } from "@/components/community/QuickShareDialog";
import { CommunityPostCard } from "@/components/community/CommunityPostCard";
import {
  CommunityFilterBar,
  type CommunityFeedFilters,
} from "@/components/community/CommunityFilterBar";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { PageShell } from "@/components/layout/PageShell";
import { CollapsingPageHeader } from "@/components/layout/CollapsingPageHeader";
import { Button } from "@/components/ui/button";
import { consumerPageShellClass } from "@/lib/design-tokens";
import { getUserErrorMessage } from "@/lib/user-error-message";
import { DEMO_DATA_ENABLED } from "@/lib/demo-data";
import { useDemoCommunityEnabled, useToggleDemoCommunity } from "@/hooks/use-demo-community";
import { cn } from "@/lib/utils";

const SORTS = [
  { value: "latest" as const, label: "Mới nhất", icon: Clock },
  { value: "popular" as const, label: "Được yêu thích", icon: TrendingUp },
];

export default function CommunityPage() {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const [sort, setSort] = useState<"latest" | "popular">("latest");
  const [filters, setFilters] = useState<CommunityFeedFilters>({});
  const demoOn = useDemoCommunityEnabled();
  const toggleDemo = useToggleDemoCommunity();

  const { data: filterOptions } = useQuery({
    queryKey: ["community-filters"],
    queryFn: () => communityApi.getFilterOptions(),
    staleTime: 300_000,
  });

  const { data, isLoading, isError, hasNextPage, fetchNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["community-feed", sort, demoOn ? "demo" : "live", filters],
    queryFn: ({ pageParam }) =>
      communityApi.getFeed(pageParam, 24, { sort, ...filters }),
    initialPageParam: 0,
    getNextPageParam: nextCommunityPage,
  });

  const posts = data?.pages.flatMap((page) => page.items) ?? [];
  const total = data?.pages[data.pages.length - 1]?.total ?? 0;
  const hasActiveFilters = Object.values(filters).some(Boolean);

  const likeMutation = useMutation({
    mutationFn: ({ postId, liked }: { postId: string; liked: boolean }) =>
      communityApi.setLike(postId, liked),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["community-feed"] });
    },
    onError: (err) => toast.error(getUserErrorMessage(err, "Không thể thích bài đăng.")),
  });

  const saveMutation = useMutation({
    mutationFn: ({ postId, saved }: { postId: string; saved: boolean }) =>
      communityApi.setSave(postId, saved),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["community-feed"] });
    },
    onError: (err) => toast.error(getUserErrorMessage(err, "Không thể lưu bài đăng.")),
  });

  return (
    <PageShell width="full" className={consumerPageShellClass}>
      <CollapsingPageHeader
        title="Cộng đồng thời trang"
        subtitle="Outfit của người thật, phối bằng AI trên FitMe"
        backHref="/discover"
        backLabel="Khám phá"
        trailing={<QuickShareDialog triggerClassName="rounded-full" />}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {SORTS.map((option) => {
          const Icon = option.icon;
          const active = sort === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setSort(option.value)}
              aria-pressed={active}
              className={cn(
                "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors",
                active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {option.label}
            </button>
          );
        })}
        <span className="ml-auto flex items-center gap-3">
          {DEMO_DATA_ENABLED && (
            <button
              type="button"
              onClick={() => {
                toggleDemo(!demoOn);
                void queryClient.invalidateQueries({ queryKey: ["community-feed"] });
              }}
              aria-pressed={demoOn}
              className={cn(
                "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors",
                demoOn
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                  : "border-border text-muted-foreground",
              )}
            >
              <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" />
              {demoOn ? "Dữ liệu demo" : "Dữ liệu thật"}
            </button>
          )}
          <span className="text-xs text-muted-foreground">
            {total > 0 ? `${total} outfit` : ""}
          </span>
        </span>
      </div>

      {filterOptions && (
        <CommunityFilterBar
          options={filterOptions}
          value={filters}
          onChange={setFilters}
          className="mx-auto mb-4 max-w-2xl"
        />
      )}

      <div className="mx-auto mt-4 flex max-w-2xl flex-col gap-5">
        {isLoading ? (
          <div className="flex flex-col gap-4">
            {[1, 2].map((item) => (
              <div key={item} className="aspect-[4/5] animate-pulse rounded-2xl bg-muted sm:aspect-[3/2]" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState onRetry={() => void queryClient.invalidateQueries({ queryKey: ["community-feed"] })} />
        ) : posts.length === 0 ? (
          hasActiveFilters ? (
            <EmptyState
              title="Không có outfit nào khớp bộ lọc"
              description="Thử bỏ bớt điều kiện lọc để xem thêm outfit từ cộng đồng."
              actionLabel="Xoá lọc"
              actionHref={undefined}
              onAction={() => setFilters({})}
            />
          ) : (
            <EmptyState
              title="Chưa có outfit nào được chia sẻ"
              description="Hãy thử đồ và chia sẻ outfit đầu tiên của bạn — bài đăng sẽ xuất hiện ở đây."
              actionLabel="Thử đồ AI"
              actionHref="/try-on"
            />
          )
        ) : (
          <>
            <div className="flex flex-col gap-4">
              {posts.map((post) => (
                <CommunityPostCard
                  key={post.id}
                  post={post}
                  canInteract={isAuthenticated}
                  isDemo={post.id.startsWith("demo-post-")}
                  onLike={(liked) => likeMutation.mutate({ postId: post.id, liked })}
                  onSave={(saved) => saveMutation.mutate({ postId: post.id, saved })}
                />
              ))}
            </div>

            {hasNextPage && (
              <div className="mt-6 flex flex-col items-center gap-2">
                <Button
                  variant="outline"
                  className="rounded-full"
                  disabled={isFetchingNextPage}
                  onClick={() => void fetchNextPage()}
                >
                  {isFetchingNextPage ? "Đang tải..." : "Xem thêm"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </PageShell>
  );
}
