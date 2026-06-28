"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface UseTryOnVariantOptions {
  requestId: string;
  onApply: (requestId: string, value: string) => Promise<unknown>;
  resultPath?: string;
}

export function useTryOnVariant({ requestId, onApply, resultPath }: UseTryOnVariantOptions) {
  const router = useRouter();
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);

  const handleApply = useCallback(async () => {
    if (!selected) return;
    setLoading(true);
    try {
      await onApply(requestId, selected);
      router.push(resultPath ?? `/try-on/result/${requestId}`);
    } finally {
      setLoading(false);
    }
  }, [selected, requestId, onApply, router, resultPath]);

  return { selected, setSelected, loading, handleApply };
}
