"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { getUserErrorMessage } from "@/lib/user-error-message";
import { toast } from "@/stores/toast-store";

interface UseTryOnVariantOptions {
  requestId: string;
  onApply: (requestId: string, value: string) => Promise<unknown>;
  resultPath?: string;
}

export function useTryOnVariant({ requestId, onApply, resultPath }: UseTryOnVariantOptions) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);

  const handleApply = useCallback(async () => {
    if (!selected) return;
    setLoading(true);
    try {
      await onApply(requestId, selected);
      await queryClient.invalidateQueries({ queryKey: ["tryon-result", requestId] });
      toast.success("Đã cập nhật lựa chọn cho outfit");
      router.push(resultPath ?? `/try-on/result/${requestId}`);
    } catch (e) {
      toast.error(getUserErrorMessage(e, "Không áp dụng được thay đổi. Vui lòng thử lại."));
    } finally {
      setLoading(false);
    }
  }, [selected, requestId, onApply, router, resultPath, queryClient]);

  return { selected, setSelected, loading, handleApply };
}
