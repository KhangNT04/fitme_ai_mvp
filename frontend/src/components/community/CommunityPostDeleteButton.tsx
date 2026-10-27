"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { communityApi } from "@/services/community-api";
import { toast } from "@/stores/toast-store";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { getUserErrorMessage } from "@/lib/user-error-message";
import { cn } from "@/lib/utils";

/**
 * The "remove my post" action, available only to the author.
 *
 * Removing a post hides it from the public feed and every shared link stops working, so the
 * action always asks for a confirmation first.
 */
export function CommunityPostDeleteButton({
  postId,
  onDeleted,
  className,
  label = "Xoá bài",
}: {
  postId: string;
  /** Called after the post was removed, so the caller can refresh or navigate away. */
  onDeleted?: () => void;
  className?: string;
  label?: string;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: () => communityApi.deletePost(postId),
    onSuccess: () => {
      setOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["community-feed"] });
      void queryClient.invalidateQueries({ queryKey: ["community-posts"] });
      void queryClient.invalidateQueries({ queryKey: ["community-post"] });
      toast.success("Đã gỡ bài đăng của bạn.");
      onDeleted?.();
    },
    onError: (err) => toast.error(getUserErrorMessage(err, "Không thể gỡ bài đăng.")),
  });

  return (
    <>
      <button
        type="button"
        aria-label={label}
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex min-h-9 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-red-600",
          className,
        )}
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        {label}
      </button>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Gỡ bài đăng?"
        description="Bài đăng sẽ không còn hiện trên cộng đồng và các link chia sẻ sẽ ngừng hoạt động. Bạn không thể hoàn tác thao tác này."
        confirmLabel="Gỡ bài đăng"
        cancelLabel="Giữ lại"
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
      />
    </>
  );
}
