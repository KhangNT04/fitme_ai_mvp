"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, MessageCircle, UserPlus, UserCheck, Users } from "lucide-react";
import { communityApi, nextCommunityPage } from "@/services/community-api";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "@/stores/toast-store";
import { getUserErrorMessage } from "@/lib/user-error-message";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { PageShell } from "@/components/layout/PageShell";
import { CollapsingPageHeader } from "@/components/layout/CollapsingPageHeader";
import { Button } from "@/components/ui/button";
import { consumerPageShellClass } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { CommunityPostCard } from "@/components/community/CommunityPostCard";

/**
 * The public community profile of one author.
 *
 * <p>The author stays anonymous: only a display name, initials and counters are shown. The
 * address is a random key, so the URL can be shared without exposing an account id.
 */
export default function CommunityAuthorPage() {
  const params = useParams<{ authorKey: string }>();
  const authorKey = typeof params?.authorKey === "string" ? params.authorKey : "";

  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const [followed, setFollowed] = useState<boolean | null>(null);

  const authorQuery = useQuery({
    queryKey: ["community-author", authorKey],
    queryFn: () => communityApi.getAuthor(authorKey),
    enabled: Boolean(authorKey),
    retry: false,
  });

  const postsQuery = useInfiniteQuery({
    queryKey: ["community-author-posts", authorKey],
    queryFn: ({ pageParam }) => communityApi.getAuthorPosts(authorKey, pageParam, 24),
    initialPageParam: 0,
    getNextPageParam: nextCommunityPage,
    enabled: Boolean(authorKey),
  });

  const followMutation = useMutation({
    mutationFn: (next: boolean) =>
      next ? communityApi.followAuthor(authorKey) : communityApi.unfollowAuthor(authorKey),
    onSuccess: (result) => {
      setFollowed(result);
      void queryClient.invalidateQueries({ queryKey: ["community-author", authorKey] });
    },
    onError: (error) => toast.error(getUserErrorMessage(error, "Không thể theo dõi người dùng này.")),
  });

  const author = authorQuery.data;
  const posts = postsQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const isFollowing = followed ?? author?.followedByMe ?? false;

  const likeMutation = useMutation({
    mutationFn: ({ postId, liked }: { postId: string; liked: boolean }) =>
      communityApi.setLike(postId, liked),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["community-author-posts"] });
    },
    onError: (error) => toast.error(getUserErrorMessage(error, "Không thể thích bài đăng.")),
  });

  const saveMutation = useMutation({
    mutationFn: ({ postId, saved }: { postId: string; saved: boolean }) =>
      communityApi.setSave(postId, saved),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["community-author-posts"] });
    },
    onError: (error) => toast.error(getUserErrorMessage(error, "Không thể lưu bài đăng.")),
  });

  if (authorQuery.isError) {
    return (
      <PageShell width="full" className={consumerPageShellClass}>
        <CollapsingPageHeader
          title="Hồ sơ cộng đồng"
          backHref="/community"
          backLabel="Cộng đồng"
        />
        <div className="mx-auto max-w-2xl">
          <ErrorState
            message="Không tìm thấy người dùng này."
            onRetry={() => void authorQuery.refetch()}
          />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell width="full" className={consumerPageShellClass}>
      <CollapsingPageHeader
        title={author?.displayName ?? "Hồ sơ cộng đồng"}
        subtitle={author ? `${author.publishedPosts} outfit đã chia sẻ` : undefined}
        backHref="/community"
        backLabel="Cộng đồng"
      />

      <div className="mx-auto flex max-w-2xl flex-col gap-5">
        {author && (
          <section className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base font-semibold text-primary">
              {author.initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-base font-semibold text-foreground">
                {author.displayName}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" aria-hidden="true" />
                  {author.publishedPosts} bài đăng
                </span>
                <span className="inline-flex items-center gap-1">
                  <Heart className="h-3.5 w-3.5" aria-hidden="true" />
                  {author.totalLikes} lượt thích
                </span>
                <span className="inline-flex items-center gap-1">
                  <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                  {author.totalComments} bình luận
                </span>
              </div>
            </div>
            {isAuthenticated && (
              <Button
                type="button"
                variant={isFollowing ? "outline" : "default"}
                size="sm"
                className="shrink-0 rounded-full"
                disabled={followMutation.isPending}
                onClick={() => followMutation.mutate(!isFollowing)}
              >
                {isFollowing ? (
                  <>
                    <UserCheck className="mr-1 h-4 w-4" aria-hidden="true" />
                    Đang theo dõi
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-1 h-4 w-4" aria-hidden="true" />
                    Theo dõi
                  </>
                )}
              </Button>
            )}
          </section>
        )}

        {postsQuery.isLoading ? (
          <div className="flex flex-col gap-4">
            {[1, 2].map((item) => (
              <div key={item} className="aspect-[4/5] animate-pulse rounded-2xl bg-muted sm:aspect-[3/2]" />
            ))}
          </div>
        ) : postsQuery.isError ? (
          <ErrorState onRetry={() => void postsQuery.refetch()} />
        ) : posts.length === 0 ? (
          <EmptyState
            title="Chưa có bài đăng công khai"
            description="Người dùng này chưa chia sẻ outfit nào. Hãy quay lại cộng đồng để xem các bài khác."
            actionLabel="Về cộng đồng"
            actionHref="/community"
          />
        ) : (
          <>
            <div className="flex flex-col gap-4">
              {posts.map((post) => (
                <CommunityPostCard
                  key={post.id}
                  post={post}
                  canInteract={isAuthenticated}
                  onLike={(liked) => likeMutation.mutate({ postId: post.id, liked })}
                  onSave={(saved) => saveMutation.mutate({ postId: post.id, saved })}
                />
              ))}
            </div>

            {postsQuery.hasNextPage && (
              <div className="flex flex-col items-center gap-2">
                <Button
                  variant="outline"
                  className="rounded-full"
                  disabled={postsQuery.isFetchingNextPage}
                  onClick={() => void postsQuery.fetchNextPage()}
                >
                  {postsQuery.isFetchingNextPage ? "Đang tải..." : "Xem thêm"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </PageShell>
  );
}
