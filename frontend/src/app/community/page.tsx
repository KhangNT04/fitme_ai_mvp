"use client";

import { useState } from "react";
import Link from "next/link";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart, Bookmark, TrendingUp, Clock, FlaskConical, MessageCircle, Share2, Check } from "lucide-react";
import { communityApi, nextCommunityPage } from "@/services/community-api";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "@/stores/toast-store";
import { IntrinsicImage } from "@/components/common/IntrinsicImage";
import { QuickShareDialog } from "@/components/community/QuickShareDialog";
import { CommunityCommentsModal } from "@/components/community/CommunityCommentsModal";
import { CommunityPostDeleteButton } from "@/components/community/CommunityPostDeleteButton";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { PageShell } from "@/components/layout/PageShell";
import { CollapsingPageHeader } from "@/components/layout/CollapsingPageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { consumerPageShellClass } from "@/lib/design-tokens";
import { communityShareCaption, communityShareUrl, shareCommunityPost } from "@/lib/community-share";
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
          <EmptyState
            title="Chưa có outfit nào được chia sẻ"
            description="Hãy thử đồ và chia sẻ outfit đầu tiên của bạn — bài đăng sẽ xuất hiện ở đây."
            actionLabel="Thử đồ AI"
            actionHref="/try-on"
          />
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

/**
 * A post in the feed, laid out like a social-network card: author header, photo, then an
 * action bar with like / comment / share and a live comment count.
 */
export function CommunityPostCard({
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
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [shareState, setShareState] = useState<"idle" | "copied" | "failed">("idle");
  const handleShare = async () => {
    const url = communityShareUrl(post.shareCode);
    const result = await shareCommunityPost({
      url,
      title: post.title ?? "Outfit trên FitMe",
      text: communityShareCaption({ brandNames: post.brandNames, styleLabel: post.styleLabel }),
    });
    if (result === "copied") {
      setShareState("copied");
      toast.success("Đã sao chép link. Dán vào bài đăng của bạn nhé!");
    } else if (result === "failed") {
      setShareState("failed");
      toast.error("Không thể chia sẻ. Hãy copy link thủ công.");
    }
    window.setTimeout(() => setShareState("idle"), 2000);
  };

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card">
      <header className="flex items-center gap-2.5 p-3 sm:p-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {post.authorInitials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{post.authorDisplayName}</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {post.styleLabel ?? "Outfit"} · {formatDateTime(post.createdAt)}
          </p>
        </div>
        {isDemo && (
          <Badge variant="outline" className="shrink-0 border-amber-500/40 text-amber-700 dark:text-amber-400">
            Demo
          </Badge>
        )}
        {post.mine && !isDemo && (
          <CommunityPostDeleteButton postId={post.id} className="shrink-0" />
        )}
      </header>

      <Link href={`/outfit/${post.shareCode}`} className="block">
        <IntrinsicImage
          src={post.imageUrl}
          alt={post.title ?? "Outfit cộng đồng"}
          fallbackAspectRatio={4 / 5}
          showErrorHint
          className="bg-muted"
        />
      </Link>

      {(post.title || post.caption) && (
        <div className="space-y-1 px-3 pt-3 sm:px-4">
          {post.title && (
            <p className="text-sm font-semibold text-foreground">{post.title}</p>
          )}
          {post.caption && (
            <p className="line-clamp-2 text-sm text-muted-foreground">{post.caption}</p>
          )}
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-1.5 px-3 sm:px-4">
        {post.brandNames.slice(0, 3).map((name) => (
          <Badge key={name} variant="secondary" className="text-[10px]">
            {name}
          </Badge>
        ))}
        {post.occasion && (
          <Badge variant="outline" className="text-[10px]">
            {post.occasion}
          </Badge>
        )}
      </div>

      <div className="mt-2 flex items-center gap-3 border-b border-border/40 px-3 py-1.5 text-[11px] text-muted-foreground sm:px-4">
        {post.likeCount > 0 && (
          <span className="inline-flex items-center gap-1">
            <Heart className="h-3 w-3 fill-red-400 text-red-400" aria-hidden="true" />
            {post.likeCount}
          </span>
        )}
        {post.commentCount > 0 && (
          <span>
            {post.commentCount} bình luận
          </span>
        )}
        <span className="ml-auto">{post.viewCount} lượt xem</span>
      </div>

      <div className="flex items-center gap-1 px-2 py-1.5 sm:px-3">
        <button
          type="button"
          aria-label={post.likedByMe ? "Bỏ thích" : "Thích"}
          aria-pressed={post.likedByMe}
          disabled={!canInteract}
          onClick={() => onLike(!post.likedByMe)}
          className={cn(
            "inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-full text-xs font-medium transition-colors disabled:opacity-50",
            post.likedByMe ? "text-red-600" : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <Heart className={cn("h-4 w-4", post.likedByMe && "fill-red-400 text-red-400")} aria-hidden="true" />
          Thích
        </button>
        <button
          type="button"
          aria-label="Bình luận"
          aria-haspopup="dialog"
          onClick={() => setCommentsOpen(true)}
          className="inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-full text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          Bình luận
        </button>
        <button
          type="button"
          aria-label="Chia sẻ"
          onClick={() => void handleShare()}
          className="inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-full text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {shareState === "copied" ? (
            <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />
          ) : (
            <Share2 className="h-4 w-4" aria-hidden="true" />
          )}
          Chia sẻ
        </button>
        <button
          type="button"
          aria-label={post.savedByMe ? "Bỏ lưu" : "Lưu"}
          aria-pressed={post.savedByMe}
          disabled={!canInteract}
          onClick={() => onSave(!post.savedByMe)}
          className={cn(
            "inline-flex min-h-9 w-9 items-center justify-center rounded-full transition-colors disabled:opacity-50",
            post.savedByMe ? "text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <Bookmark className={cn("h-4 w-4", post.savedByMe && "fill-current")} aria-hidden="true" />
        </button>
      </div>

      {commentsOpen && (
        <CommunityCommentsModal post={post} open={commentsOpen} onOpenChange={setCommentsOpen} />
      )}
    </article>
  );
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("vi-VN", { dateStyle: "medium", timeStyle: "short" });
}
