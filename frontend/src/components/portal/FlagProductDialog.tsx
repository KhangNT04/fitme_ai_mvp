"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FlagProductDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName?: string;
  loading?: boolean;
  onConfirm: (reason: string) => void;
};

export function FlagProductDialog({
  open,
  onOpenChange,
  productName,
  loading = false,
  onConfirm,
}: FlagProductDialogProps) {
  const [reason, setReason] = useState("");

  const handleOpenChange = (next: boolean) => {
    if (!next) setReason("");
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Gắn cờ sản phẩm</DialogTitle>
          <DialogDescription>
            {productName
              ? `Sản phẩm "${productName}" sẽ chuyển sang trạng thái cần xử lý và không hiển thị công khai.`
              : "Sản phẩm sẽ chuyển sang trạng thái cần xử lý và không hiển thị công khai."}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2 space-y-2">
          <Label htmlFor="flag-reason">Lý do gắn cờ</Label>
          <textarea
            id="flag-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ví dụ: Ảnh không đúng sản phẩm, giá sai, vi phạm chính sách..."
            rows={4}
            className={cn(
              "flex w-full rounded-xl border border-border bg-background px-3 py-2 text-sm",
              "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
          />
        </div>
        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" disabled={loading} onClick={() => handleOpenChange(false)}>
            Hủy
          </Button>
          <Button
            type="button"
            disabled={loading || !reason.trim()}
            className="bg-orange-600 hover:bg-orange-700"
            onClick={() => onConfirm(reason.trim())}
          >
            {loading ? "Đang gắn cờ..." : "Gắn cờ"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
