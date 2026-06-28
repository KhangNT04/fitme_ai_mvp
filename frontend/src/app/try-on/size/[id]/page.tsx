"use client";

import { use, useCallback } from "react";
import { tryonApi } from "@/services/tryon-api";
import { TryOnVariantShell } from "@/components/tryon/TryOnVariantShell";
import { useTryOnVariant } from "@/hooks/use-tryon-variant";

const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

export default function TryOnSizePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const onApply = useCallback((requestId: string, value: string) => tryonApi.variantSize(requestId, value), []);
  const { selected, setSelected, loading, handleApply } = useTryOnVariant({ requestId: id, onApply });

  return (
    <TryOnVariantShell
      title="So sánh size"
      subtitle="Thử size khác cho outfit"
      options={SIZES}
      selected={selected}
      onSelect={setSelected}
      applyLabel="Áp dụng size"
      onApply={handleApply}
      loading={loading}
      backHref={`/try-on/result/${id}`}
    />
  );
}
