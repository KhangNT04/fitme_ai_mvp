"use client";

import { ReasonDialog } from "@/components/commerce/ReasonDialog";

/** Backend stores moderation reasons in product_tags.tag_value VARCHAR(100). */
export const PRODUCT_REASON_MAX_LENGTH = 100;

type RejectProductDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName?: string;
  loading?: boolean;
  onConfirm: (reason: string) => void;
};

export function RejectProductDialog({ open, onOpenChange, productName, loading, onConfirm }: RejectProductDialogProps) {
  return (
    <ReasonDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Từ chối sản phẩm"
      description={
        productName
          ? `Brand sẽ thấy lý do này để sửa "${productName}" rồi gửi duyệt lại.`
          : "Brand sẽ thấy lý do này để sửa sản phẩm rồi gửi duyệt lại."
      }
      label="Lý do từ chối"
      placeholder="Ví dụ: Ảnh mờ, thiếu bảng size, link mua hàng sai..."
      confirmLabel="Từ chối"
      required
      destructive
      loading={loading}
      maxLength={PRODUCT_REASON_MAX_LENGTH}
      onConfirm={onConfirm}
    />
  );
}
