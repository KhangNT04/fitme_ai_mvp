"use client";

import Link from "next/link";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { CommunityComments } from "@/components/community/CommunityComments";
import { AppImage } from "@/components/common/AppImage";
import { cn } from "@/lib/utils";
import type { CommunityPost } from "@/types";

/**
 * A Facebook-style comment modal: the post is summarised at the top, the thread scrolls in
 * the middle and the composer stays pinned at the bottom. Opening it keeps the feed clean —
 * readers only load the discussion of the post they actually care about.
 */
export function CommunityCommentsModal({
  post,
  open,
  onOpenChange,
}: {
  post: CommunityPost;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const commentCount = post.commentCount ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[88vh] w-full max-w-lg flex-col gap-0 overflow-hidden p-0",
          "sm:max-w-xl",
        )}
      >
        <DialogTitle className="sr-only">Bình luận bài đăng</DialogTitle>

        {/* Post summary — mirrors the card the reader clicked on. */}
        <div className="flex items-center gap-2.5 border-b border-border/60 px-3 py-3 pr-10 sm:px-4 sm:pr-10">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {post.authorInitials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{post.authorDisplayName}</p>
            <p className="truncate text-[11px] text-muted-foreground">
              <span>{post.title ?? "Outfit"}</span>
              {commentCount > 0 && (
                <>
                  {" · "}
                  <span>{commentCount} bình luận</span>
                </>
              )}
            </p>
          </div>
        </div>

        {post.imageUrl && (
          <Link
            href={`/outfit/${post.shareCode}`}
            onClick={() => onOpenChange(false)}
            className="relative block h-28 w-full shrink-0 overflow-hidden bg-muted sm:h-36"
            aria-label="Xem trang bài đăng"
          >
            <AppImage
              src={post.imageUrl}
              alt={post.title ?? "Outfit cộng đồng"}
              fill
              className="object-cover"
              unoptimized
            />
          </Link>
        )}

        <CommunityComments postId={post.id} variant="modal" />
      </DialogContent>
    </Dialog>
  );
}
