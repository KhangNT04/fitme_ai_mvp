"use client";

import { useQuery } from "@tanstack/react-query";
import { ImageOff, Share2, ExternalLink } from "lucide-react";
import Link from "next/link";
import { communityApi } from "@/services/community-api";
import { IntrinsicImage } from "@/components/common/IntrinsicImage";
import { CommunityPostDeleteButton } from "@/components/community/CommunityPostDeleteButton";
import { CommunityPostEditButton } from "@/components/community/CommunityPostEditButton";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { Badge } from "@/components/ui/badge";

/**
 * The posts the signed-in user published, with the action to remove any of them.
 *
 * A removed post stays in this list (marked as removed) so the author can see what they once
 * shared instead of wondering where it went.
 */
export function ProfileMyPostsTab() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["community-posts", "mine"],
    queryFn: () => communityApi.getMyPosts(0, 24),
    staleTime: 30_000,
  });

  const { data: communityProfile } = useQuery({
    queryKey: ["community-profile", "mine"],
    queryFn: () => communityApi.getMyProfile(),
    staleTime: 60_000,
  });

  const posts = data?.items ?? [];
  const authorKey = communityProfile?.authorKey;

  if (isLoading) {
    return <LoadingSkeleton type="card" />;
  }

  if (isError) {
    return <ErrorState onRetry={() => void refetch()} />;
  }

  if (posts.length === 0) {
    return (
      <EmptyState
        title="Bạn chưa chia sẻ outfit nào"
        description="Chia sẻ outfit của bạn lên cộng đồng để nhận thưởng Fitken và xem ý kiến của mọi người."
        actionLabel="Chia sẻ nhanh"
        actionHref="/community"
      />
    );
  }

  return (
    <>
      {authorKey && (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2.5">
          <p className="text-xs text-muted-foreground">
            Hồ sơ cộng đồng của bạn — những gì người khác thấy khi mở trang của bạn.
          </p>
          <Link
            href={`/community/author/${authorKey}`}
            className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-muted"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            Xem hồ sơ
          </Link>
        </div>
      )}

      <ul className="space-y-3">
        {posts.map((post) => {
          const removed = post.visibility === "REMOVED";
          return (
          <li
            key={post.id}
            className="flex gap-3 rounded-xl border border-border bg-card p-3"
          >
            <Link
              href={`/outfit/${post.shareCode}`}
              className="w-20 shrink-0 overflow-hidden rounded-lg"
              aria-hidden="true"
              tabIndex={-1}
            >
              <IntrinsicImage
                src={post.imageUrl}
                alt=""
                fallbackAspectRatio={3 / 4}
                className="rounded-lg"
              />
            </Link>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {post.title ?? "Outfit"}
              </p>
              {post.caption && (
                <p className="line-clamp-2 text-xs text-muted-foreground">{post.caption}</p>
              )}
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {post.styleLabel && (
                  <Badge variant="secondary" className="text-[10px]">
                    {post.styleLabel}
                  </Badge>
                )}
                {post.occasion && (
                  <Badge variant="outline" className="text-[10px]">
                    {post.occasion}
                  </Badge>
                )}
                {removed && (
                  <Badge variant="outline" className="text-[10px] text-muted-foreground">
                    <ImageOff className="mr-1 h-3 w-3" aria-hidden="true" />
                    Đã gỡ
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-end justify-between gap-2">
              <Link
                href={`/outfit/${post.shareCode}`}
                className="inline-flex min-h-9 items-center gap-1 rounded-full px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
                Xem
              </Link>
              {!removed && (
                <div className="flex items-center gap-1">
                  <CommunityPostEditButton post={post} label="Sửa" />
                  <CommunityPostDeleteButton postId={post.id} label="Gỡ" />
                </div>
              )}
            </div>
          </li>
          );
        })}
      </ul>
    </>
  );
}
