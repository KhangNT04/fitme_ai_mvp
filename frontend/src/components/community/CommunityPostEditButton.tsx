"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil } from "lucide-react";
import { communityApi } from "@/services/community-api";
import { toast } from "@/stores/toast-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { getUserErrorMessage } from "@/lib/user-error-message";
import { cn } from "@/lib/utils";
import type { CommunityPost } from "@/types";

const MAX_TITLE = 200;
const MAX_CAPTION = 2000;

/**
 * Lets the author fix the words of a post they already published.
 *
 * <p>Only the title and the caption can change — the photo, style and occasion stay as they
 * were, so a link shared earlier keeps pointing at the same outfit.
 */
export function CommunityPostEditButton({
  post,
  className,
  label = "Sửa",
  onUpdated,
}: {
  post: CommunityPost;
  className?: string;
  /** The text shown next to the pencil. */
  label?: string;
  /** Called with the updated post so the caller can refresh the list. */
  onUpdated?: (post: CommunityPost) => void;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const updateMutation = useMutation({
    mutationFn: (payload: { title?: string; caption?: string }) =>
      communityApi.updatePost(post.id, payload),
    onSuccess: (updated) => {
      setOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["community-feed"] });
      void queryClient.invalidateQueries({ queryKey: ["community-posts", "mine"] });
      void queryClient.invalidateQueries({ queryKey: ["community-author-posts"] });
      void queryClient.invalidateQueries({ queryKey: ["community-post"] });
      toast.success("Đã cập nhật bài đăng.");
      onUpdated?.(updated);
    },
    onError: (err) => toast.error(getUserErrorMessage(err, "Không thể cập nhật bài đăng.")),
  });

  return (
    <>
      <button
        type="button"
        aria-label={label}
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex min-h-9 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
          className,
        )}
      >
        <Pencil className="h-4 w-4" aria-hidden="true" />
        {label}
      </button>

      {open && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="w-full max-w-lg">
            <DialogTitle className="font-display text-base font-semibold text-foreground">
              Sửa bài đăng
            </DialogTitle>

            <EditPostForm
              post={post}
              isPending={updateMutation.isPending}
              onClose={() => setOpen(false)}
              onSubmit={(payload) => updateMutation.mutate(payload)}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

/**
 * The editable fields of a post.
 *
 * <p>It is mounted only while the dialog is open, so it starts from the current words of the
 * post without needing an effect to copy them into local state.
 */
function EditPostForm({
  post,
  isPending,
  onClose,
  onSubmit,
}: {
  post: CommunityPost;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (payload: { title?: string; caption?: string }) => void;
}) {
  const [title, setTitle] = useState(post.title ?? "");
  const [caption, setCaption] = useState(post.caption ?? "");

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({
          ...(title.trim() ? { title: title.trim() } : {}),
          ...(caption.trim() ? { caption: caption.trim() } : {}),
        });
      }}
    >
      <label className="block">
        <span className="text-xs font-medium text-foreground">Tiêu đề</span>
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value.slice(0, MAX_TITLE))}
          maxLength={MAX_TITLE}
          placeholder="Tiêu đề của bài đăng"
          className="mt-1"
        />
      </label>

      <label className="block">
        <span className="text-xs font-medium text-foreground">Mô tả</span>
        <textarea
          value={caption}
          onChange={(event) => setCaption(event.target.value.slice(0, MAX_CAPTION))}
          maxLength={MAX_CAPTION}
          rows={4}
          placeholder="Mô tả outfit của bạn…"
          className="mt-1 w-full resize-y rounded-xl border border-border bg-card px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <span className="mt-1 block text-right text-[11px] text-muted-foreground">
          {caption.length}/{MAX_CAPTION}
        </span>
      </label>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" className="rounded-full" onClick={onClose}>
          Huỷ
        </Button>
        <Button type="submit" className="rounded-full" disabled={isPending}>
          {isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />}
          Lưu thay đổi
        </Button>
      </div>
    </form>
  );
}
