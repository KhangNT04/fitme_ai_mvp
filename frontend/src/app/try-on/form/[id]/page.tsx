"use client";

import { use, useCallback } from "react";
import { tryonApi } from "@/services/tryon-api";
import { TryOnVariantShell } from "@/components/tryon/TryOnVariantShell";
import { useTryOnVariant } from "@/hooks/use-tryon-variant";

const FORMS = ["Slim", "Regular", "Relaxed", "Oversize"];

export default function TryOnFormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const onApply = useCallback((requestId: string, value: string) => tryonApi.variantForm(requestId, value), []);
  const { selected, setSelected, loading, handleApply } = useTryOnVariant({ requestId: id, onApply });

  return (
    <TryOnVariantShell
      title="So sánh form"
      subtitle="Thử form khác cho outfit"
      options={FORMS}
      selected={selected}
      onSelect={setSelected}
      applyLabel="Áp dụng form"
      onApply={handleApply}
      loading={loading}
      backHref={`/try-on/result/${id}`}
    />
  );
}
