"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart, Bookmark, MessageCircle, Share2, Check } from "lucide-react";
import { IntrinsicImage } from "@/components/common/IntrinsicImage";
import { CommunityCommentsModal } from "@/components/community/CommunityCommentsModal";
import { CommunityPostDeleteButton } from "@/components/community/CommunityPostDeleteButton";
import { CommunityPostEditButton } from "@/components/community/CommunityPostEditButton";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/stores/toast-store";
import { communityShareCaption, communityShareUrl, shareCommunityPost } from "@/lib/community-share";
import { cn } from "@/lib/utils";
import type { CommunityPost } from "@/types";

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
          {post.authorKey ? (
            <Link
              href={`/community/author/${post.authorKey}`}
              className="block truncate text-sm font-semibold text-foreground underline-offset-2 hover:underline"
            >
              {post.authorDisplayName}
            </Link>
          ) : (
            <p className="truncate text-sm font-semibold text-foreground">{post.authorDisplayName}</p>
          )}
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
          <CommunityPostEditButton post={post} className="shrink-0" />
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
