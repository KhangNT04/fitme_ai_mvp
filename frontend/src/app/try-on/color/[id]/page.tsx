"use client";

import { use, useCallback } from "react";
import { tryonApi } from "@/services/tryon-api";
import { TryOnVariantShell } from "@/components/tryon/TryOnVariantShell";
import { useTryOnVariant } from "@/hooks/use-tryon-variant";

const COLORS = ["Đen", "Trắng", "Navy", "Beige", "Nâu", "Xám", "Pastel"];

export default function TryOnColorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const onApply = useCallback((requestId: string, value: string) => tryonApi.variantColor(requestId, value), []);
  const { selected, setSelected, loading, handleApply } = useTryOnVariant({ requestId: id, onApply });

  return (
    <TryOnVariantShell
      title="So sánh màu"
      subtitle="Thử màu khác cho outfit"
      options={COLORS}
      selected={selected}
      onSelect={setSelected}
      applyLabel="Áp dụng màu"
      onApply={handleApply}
      loading={loading}
      backHref={`/try-on/result/${id}`}
    />
  );
}
