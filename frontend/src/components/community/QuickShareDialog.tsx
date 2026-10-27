"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";
import { QuickShareCard } from "@/components/community/QuickShareCard";

/**
 * Trigger + dialog for the quick-share flow.
 *
 * The trigger is placed on the right-hand side of the "Cộng đồng thời trang" card so
 * sharing is one tap away from the feed instead of a trip through the gallery.
 */
export function QuickShareDialog({
  triggerClassName,
  triggerLabel = "Chia sẻ nhanh",
}: {
  triggerClassName?: string;
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className={triggerClassName ?? "shrink-0 rounded-full"}
        onClick={() => setOpen(true)}
      >
        <Share2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
        {triggerLabel}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogTitle>Chia sẻ nhanh</DialogTitle>
          <DialogDescription className="mt-1">
            Chọn ảnh thử mặc của bạn để đăng ngay lên cộng đồng.
          </DialogDescription>
          <div className="mt-4">
            <QuickShareCard className="border-0 bg-transparent p-0 shadow-none" />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
