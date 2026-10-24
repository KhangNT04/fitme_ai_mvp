"use client";

import { useState } from "react";
import Link from "next/link";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart, Bookmark, Users, Sparkles, TrendingUp, Clock, FlaskConical } from "lucide-react";
import { communityApi, nextCommunityPage } from "@/services/community-api";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "@/stores/toast-store";
import { AppImage } from "@/components/common/AppImage";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { PageShell } from "@/components/layout/PageShell";
import { CollapsingPageHeader } from "@/components/layout/CollapsingPageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { consumerPageShellClass, catalogProductGridClass } from "@/lib/design-tokens";
import { getUserErrorMessage } from "@/lib/user-error-message";
import { DEMO_DATA_ENABLED } from "@/lib/demo-data";
import { useDemoCommunityEnabled, useToggleDemoCommunity } from "@/hooks/use-demo-community";
import { cn } from "@/lib/utils";
import type { CommunityPost } from "@/types";

const SORTS = [
  { value: "latest" as const, label: "Mới nhất", icon: Clock },
  { value: "popular" as const, label: "Được yêu thích", icon: TrendingUp },
];

export default function CommunityPage() {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const [sort, setSort] = useState<"latest" | "popular">("latest");
  const demoOn = useDemoCommunityEnabled();
  const toggleDemo = useToggleDemoCommunity();

  const { data, isLoading, isError, hasNextPage, fetchNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["community-feed", sort, demoOn ? "demo" : "live"],
    queryFn: ({ pageParam }) => communityApi.getFeed(pageParam, 24, { sort }),
    initialPageParam: 0,
    getNextPageParam: nextCommunityPage,
  });

  const posts = data?.pages.flatMap((page) => page.items) ?? [];
  const total = data?.pages[data.pages.length - 1]?.total ?? 0;

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

      {isLoading ? (
        <div className={cn(catalogProductGridClass, "mt-4")}>
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="aspect-[3/4] animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => void queryClient.invalidateQueries({ queryKey: ["community-feed"] })} />
      ) : posts.length === 0 ? (
        <EmptyState
          title="Chưa có outfit nào được chia sẻ"
          description="Hãy thử đồ và chia sẻ outfit đầu tiên của bạn — bài đăng sẽ xuất hiện ở đây."
          actionLabel="Thử đồ AI"
          actionHref="/try-on"
        />
      ) : (
        <>
          <div className={cn(catalogProductGridClass, "mt-4")}>
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

      <div className="mt-8 rounded-2xl bg-primary p-5 text-center text-primary-foreground">
        <Users className="mx-auto mb-2 h-6 w-6" aria-hidden="true" />
        <p className="font-display text-base font-semibold">Chia sẻ outfit của bạn</p>
        <p className="mt-1 text-sm text-primary-foreground/85">
          Lưu ảnh thử mặc vào thư viện rồi đăng công khai từ đó.
        </p>
        <Button asChild variant="secondary" size="sm" className="mt-3 rounded-full">
          <Link href="/profile/gallery">
            <Sparkles className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Mở thư viện ảnh
          </Link>
        </Button>
      </div>
    </PageShell>
  );
}

function CommunityPostCard({
  post,
  canInteract,
  isDemo,
  onLike,
  onSave,
}: {
  post: CommunityPost;
  canInteract: boolean;
  isDemo?: boolean;
  onLike: (liked: boolean) => void;
  onSave: (saved: boolean) => void;
}) {
  return (
    <article className="group relative overflow-hidden rounded-xl border border-border bg-card">
      <Link href={`/outfit/${post.shareCode}`} className="block">
        <span className="relative block aspect-[3/4] w-full overflow-hidden bg-muted">
          <AppImage
            src={post.imageUrl}
            alt={post.title ?? "Outfit cộng đồng"}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            unoptimized
          />
        </span>
      </Link>

      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent p-2">
        <div className="min-w-0 text-white">
          <p className="truncate text-xs font-medium">{post.authorDisplayName}</p>
          {post.brandNames.length > 0 && (
            <p className="truncate text-[10px] opacity-85">{post.brandNames.slice(0, 2).join(" · ")}</p>
          )}
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            aria-label={post.likedByMe ? "Bỏ thích" : "Thích"}
            aria-pressed={post.likedByMe}
            disabled={!canInteract}
            onClick={() => onLike(!post.likedByMe)}
            className="flex min-h-8 min-w-8 items-center justify-center rounded-full bg-black/40 text-white disabled:opacity-50"
          >
            <Heart className={cn("h-4 w-4", post.likedByMe && "fill-red-400 text-red-400")} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label={post.savedByMe ? "Bỏ lưu" : "Lưu"}
            aria-pressed={post.savedByMe}
            disabled={!canInteract}
            onClick={() => onSave(!post.savedByMe)}
            className="flex min-h-8 min-w-8 items-center justify-center rounded-full bg-black/40 text-white disabled:opacity-50"
          >
            <Bookmark className={cn("h-4 w-4", post.savedByMe && "fill-white")} aria-hidden="true" />
          </button>
        </div>
      </div>

      {post.likeCount > 0 && (
        <span className="absolute right-2 top-2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-medium text-white">
          {post.likeCount}
        </span>
      )}

      {isDemo && (
        <span className="absolute left-2 top-2 rounded-full bg-amber-500/90 px-2 py-0.5 text-[10px] font-medium text-white">
          Demo
        </span>
      )}
    </article>
  );
}
