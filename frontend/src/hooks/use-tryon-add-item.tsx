"use client";

import { useCallback, useState } from "react";
import { useTryOnStore } from "@/stores/tryon-store";
import {
  buildTryOnReplaceConfirmMessage,
  getTryOnItemsToReplace,
  mapCategoryToRole,
  TRY_ON_ROLE_LABELS,
  type TryOnAddItemResult,
} from "@/lib/tryon-role";
import type { TryOnItem } from "@/types/tryon";
import { toast } from "@/stores/toast-store";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";

interface TryOnAddItemOptions {
  onSuccess?: () => void;
}

interface PendingReplace {
  incoming: TryOnItem;
  replacing: TryOnItem[];
  onSuccess?: () => void;
}

export function useTryOnAddItem() {
  const selectedItems = useTryOnStore((s) => s.selectedItems);
  const addItemToStore = useTryOnStore((s) => s.addItem);
  const [pending, setPending] = useState<PendingReplace | null>(null);

  const notifyResult = useCallback((result: TryOnAddItemResult, item: TryOnItem) => {
    if (result === "unchanged") {
      toast.info("Sản phẩm đã có trong outfit");
      return;
    }
    if (result === "replaced") {
      const roleLabel = TRY_ON_ROLE_LABELS[mapCategoryToRole(item.category)];
      toast.success(`Đã chọn ${item.name} làm ${roleLabel}`);
      return;
    }
    toast.success(`Đã thêm ${item.name}`);
  }, []);

  const applyAdd = useCallback(
    (item: TryOnItem, onSuccess?: () => void) => {
      const result = addItemToStore(item);
      notifyResult(result, item);
      if (result !== "unchanged") {
        onSuccess?.();
      }
      return result;
    },
    [addItemToStore, notifyResult],
  );

  const addItem = useCallback(
    (item: TryOnItem, options?: TryOnAddItemOptions) => {
      const replacing = getTryOnItemsToReplace(selectedItems, item);
      if (replacing.length > 0) {
        setPending({ incoming: item, replacing, onSuccess: options?.onSuccess });
        return;
      }
      return applyAdd(item, options?.onSuccess);
    },
    [selectedItems, applyAdd],
  );

  const confirmMessage = pending
    ? buildTryOnReplaceConfirmMessage(pending.replacing, pending.incoming)
    : null;

  const ReplaceConfirmDialog = (
    <ConfirmDialog
      open={!!pending}
      onOpenChange={(open) => {
        if (!open) setPending(null);
      }}
      title={confirmMessage?.title ?? "Thay món trong outfit?"}
      description={confirmMessage?.description ?? ""}
      confirmLabel="Thay đổi"
      cancelLabel="Giữ nguyên"
      onConfirm={() => {
        if (!pending) return;
        const { incoming, onSuccess } = pending;
        setPending(null);
        applyAdd(incoming, onSuccess);
      }}
    />
  );

  return { addItem, ReplaceConfirmDialog };
}
