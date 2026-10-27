"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MessageCircle, Send, Trash2 } from "lucide-react";
import { communityApi } from "@/services/community-api";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "@/stores/toast-store";
import { getUserErrorMessage } from "@/lib/user-error-message";
import { cn } from "@/lib/utils";
import type { CommunityComment } from "@/types";

/** One avatar bubble with the author's initials. */
function CommentAvatar({
  initials,
  mine,
  size = "md",
}: {
  initials: string;
  mine?: boolean;
  size?: "sm" | "md";
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold",
        size === "sm" ? "h-7 w-7 text-[10px]" : "h-8 w-8 text-xs",
        mine ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
      )}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}

function relativeTime(value: string): string {
  const then = Date.parse(value);
  if (Number.isNaN(then)) return "";
  const minutes = Math.floor((Date.now() - then) / 60000);
  if (minutes < 1) return "vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ngày trước`;
  return new Date(then).toLocaleDateString("vi-VN", { dateStyle: "medium" });
}

/**
 * The comment thread of a post, laid out like a social feed: comments in chronological order,
 * one level of replies underneath, and a composer pinned to the bottom.
 */
export function CommunityComments({
  postId,
  className,
}: {
  postId: string;
  className?: string;
}) {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);

  const { data: comments, isLoading } = useQuery({
    queryKey: ["community-comments", postId],
    queryFn: () => communityApi.getComments(postId),
    enabled: Boolean(postId),
    staleTime: 30_000,
  });

  const addMutation = useMutation({
    mutationFn: (input: { content: string; parentId?: string }) =>
      communityApi.addComment(postId, input.content, input.parentId),
    onSuccess: () => {
      setDraft("");
      setReplyTo(null);
      void queryClient.invalidateQueries({ queryKey: ["community-comments", postId] });
      void queryClient.invalidateQueries({ queryKey: ["community-feed"] });
    },
    onError: (err) => toast.error(getUserErrorMessage(err, "Không thể gửi bình luận.")),
  });

  const deleteMutation = useMutation({
    mutationFn: (commentId: string) => communityApi.deleteComment(postId, commentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["community-comments", postId] });
      void queryClient.invalidateQueries({ queryKey: ["community-feed"] });
    },
    onError: (err) => toast.error(getUserErrorMessage(err, "Không thể xoá bình luận.")),
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content) return;
    addMutation.mutate({ content, ...(replyTo ? { parentId: replyTo.id } : {}) });
  };

  const list = comments ?? [];
  const totalCount = list.reduce((sum, comment) => sum + 1 + comment.replies.length, 0);

  return (
    <section className={cn("space-y-3", className)} aria-label="Bình luận">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <h3 className="font-display text-sm font-semibold text-foreground">
          Bình luận{totalCount > 0 ? ` (${totalCount})` : ""}
        </h3>
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Đang tải bình luận...</p>
      ) : list.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Chưa có bình luận nào. Hãy là người đầu tiên bình luận!
        </p>
      ) : (
        <ul className="space-y-3">
          {list.map((comment) => (
            <li key={comment.id}>
              <CommentItem
                comment={comment}
                onReply={(target) => setReplyTo({ id: target.id, name: target.authorDisplayName })}
                onDelete={(id) => deleteMutation.mutate(id)}
                deleting={deleteMutation.isPending}
              />
            </li>
          ))}
        </ul>
      )}

      {isAuthenticated ? (
        <form onSubmit={handleSubmit} className="space-y-2 pt-1">
          {replyTo && (
            <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/60 px-2.5 py-1.5 text-xs text-muted-foreground">
              <span>
                Đang trả lời <strong className="text-foreground">{replyTo.name}</strong>
              </span>
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                className="rounded-full px-1.5 py-0.5 font-medium text-muted-foreground hover:text-foreground"
              >
                Huỷ
              </button>
            </div>
          )}
          <div className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value.slice(0, 1000))}
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                  event.preventDefault();
                  handleSubmit(event);
                }
              }}
              rows={1}
              maxLength={1000}
              placeholder={replyTo ? `Trả lời ${replyTo.name}...` : "Viết bình luận..."}
              aria-label="Nội dung bình luận"
              className="min-h-10 flex-1 resize-none rounded-xl border border-border bg-card px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <button
              type="submit"
              disabled={!draft.trim() || addMutation.isPending}
              aria-label="Gửi bình luận"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-50"
            >
              {addMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </form>
      ) : (
        <p className="text-xs text-muted-foreground">
          <Link href="/auth/login" className="underline">
            Đăng nhập
          </Link>{" "}
          để bình luận bài đăng này.
        </p>
      )}
    </section>
  );
}

function CommentItem({
  comment,
  onReply,
  onDelete,
  deleting,
}: {
  comment: CommunityComment;
  onReply: (comment: CommunityComment) => void;
  onDelete: (commentId: string) => void;
  deleting: boolean;
}) {
  return (
    <div className="flex gap-2.5">
      <CommentAvatar initials={comment.authorInitials} mine={comment.mine} />
      <div className="min-w-0 flex-1">
        <div className="rounded-2xl bg-muted/70 px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="truncate text-xs font-semibold text-foreground">
              {comment.authorDisplayName}
            </span>
            <span className="shrink-0 text-[10px] text-muted-foreground">
              {relativeTime(comment.createdAt)}
            </span>
          </div>
          <p className="mt-0.5 whitespace-pre-line break-words text-sm text-foreground">
            {comment.content}
          </p>
        </div>
        <div className="mt-1 flex items-center gap-3 pl-1 text-[11px] font-medium text-muted-foreground">
          <button
            type="button"
            onClick={() => onReply(comment)}
            className="hover:text-foreground"
          >
            Trả lời
          </button>
          {comment.canDelete && (
            <button
              type="button"
              disabled={deleting}
              onClick={() => onDelete(comment.id)}
              className="inline-flex items-center gap-1 hover:text-destructive disabled:opacity-50"
            >
              <Trash2 className="h-3 w-3" aria-hidden="true" />
              Xoá
            </button>
          )}
        </div>

        {comment.replies.length > 0 && (
          <ul className="mt-2 space-y-2 border-l-2 border-border/60 pl-3">
            {comment.replies.map((reply) => (
              <li key={reply.id} className="flex gap-2">
                <CommentAvatar initials={reply.authorInitials} mine={reply.mine} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="rounded-2xl bg-muted/50 px-3 py-1.5">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-xs font-semibold text-foreground">
                        {reply.authorDisplayName}
                      </span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {relativeTime(reply.createdAt)}
                      </span>
                    </div>
                    <p className="mt-0.5 whitespace-pre-line break-words text-sm text-foreground">
                      {reply.content}
                    </p>
                  </div>
                  <div className="mt-1 flex items-center gap-3 pl-1 text-[11px] font-medium text-muted-foreground">
                    <button
                      type="button"
                      onClick={() => onReply(comment)}
                      className="hover:text-foreground"
                    >
                      Trả lời
                    </button>
                    {reply.canDelete && (
                      <button
                        type="button"
                        disabled={deleting}
                        onClick={() => onDelete(reply.id)}
                        className="inline-flex items-center gap-1 hover:text-destructive disabled:opacity-50"
                      >
                        <Trash2 className="h-3 w-3" aria-hidden="true" />
                        Xoá
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
