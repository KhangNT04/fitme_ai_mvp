"use client";

import { useState } from "react";
import Link from "next/link";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bookmark } from "lucide-react";
import { communityApi, nextCommunityPage } from "@/services/community-api";
import { toast } from "@/stores/toast-store";
import { getUserErrorMessage } from "@/lib/user-error-message";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { Button } from "@/components/ui/button";
import { IntrinsicImage } from "@/components/common/IntrinsicImage";
import { formatDateTimeDMY } from "@/lib/date-format";
import { cn } from "@/lib/utils";
import type { CommunityPost } from "@/types";

/**
 * The community posts the reader saved, shown as a tab of the "Đã lưu" page.
 *
 * <p>Each card keeps the photo and the words, plus a button to drop the post from the
 * collection again.
 */
export function SavedCommunityTab() {
  const queryClient = useQueryClient();
  const [removingId, setRemovingId] = useState<string | null>(null);

  const { data, isLoading, isError, hasNextPage, fetchNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["community-saved-posts"],
    queryFn: ({ pageParam }) => communityApi.getSavedPosts(pageParam, 24),
    initialPageParam: 0,
    getNextPageParam: nextCommunityPage,
  });

  const unsaveMutation = useMutation({
    mutationFn: (postId: string) => communityApi.setSave(postId, false),
    onSuccess: (_, postId) => {
      setRemovingId(null);
      void queryClient.invalidateQueries({ queryKey: ["community-saved-posts"] });
      void queryClient.invalidateQueries({ queryKey: ["community-feed"] });
      toast.success("Đã bỏ lưu bài đăng.");
    },
    onError: (error) => toast.error(getUserErrorMessage(error, "Không thể bỏ lưu bài đăng.")),
  });

  const posts = data?.pages.flatMap((page) => page.items) ?? [];

  if (isLoading) {
    return (
      <div className="mt-4 flex flex-col gap-4">
        {[1, 2].map((item) => (
          <div key={item} className="aspect-[4/5] animate-pulse rounded-2xl bg-muted sm:aspect-[3/2]" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mt-4">
        <ErrorState onRetry={() => void queryClient.invalidateQueries({ queryKey: ["community-saved-posts"] })} />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="mt-4">
        <EmptyState
          title="Chưa lưu bài nào của cộng đồng"
          description="Lưu những outfit bạn thích từ cộng đồng để xem lại ở đây."
          actionLabel="Khám phá cộng đồng"
          actionHref="/community"
        />
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      {posts.map((post) => (
        <SavedCommunityCard
          key={post.id}
          post={post}
          busy={removingId === post.id && unsaveMutation.isPending}
          onRemove={() => {
            setRemovingId(post.id);
            unsaveMutation.mutate(post.id);
          }}
        />
      ))}

      {hasNextPage && (
        <div className="flex flex-col items-center gap-2">
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
    </div>
  );
}

function SavedCommunityCard({
  post,
  busy,
  onRemove,
}: {
  post: CommunityPost;
  busy: boolean;
  onRemove: () => void;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card">
      <header className="flex items-center gap-2.5 p-3 sm:p-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {post.authorInitials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{post.authorDisplayName}</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {post.styleLabel ?? "Outfit"} · {formatDateTimeDMY(post.createdAt)}
          </p>
        </div>
        <button
          type="button"
          aria-label="Bỏ lưu bài đăng"
          disabled={busy}
          onClick={onRemove}
          className={cn(
            "inline-flex min-h-9 w-9 shrink-0 items-center justify-center rounded-full text-primary transition-colors hover:bg-muted disabled:opacity-50",
          )}
        >
          <Bookmark className="h-4 w-4 fill-current" aria-hidden="true" />
        </button>
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
          {post.title && <p className="text-sm font-semibold text-foreground">{post.title}</p>}
          {post.caption && <p className="line-clamp-2 text-sm text-muted-foreground">{post.caption}</p>}
        </div>
      )}
    </article>
  );
}
