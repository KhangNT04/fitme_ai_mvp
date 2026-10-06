"use client";

import { use, useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { tryonApi } from "@/services/tryon-api";
import { TryOnVariantShell } from "@/components/tryon/TryOnVariantShell";
import { useTryOnVariant } from "@/hooks/use-tryon-variant";

const COLORS = ["Đen", "Trắng", "Navy", "Beige", "Nâu", "Xám", "Pastel"];

export default function TryOnColorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [pickedItemId, setPickedItemId] = useState<string>();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["tryon-result", id],
    queryFn: () => tryonApi.getResult(id),
  });
  const items = data?.items ?? [];
  const productId = pickedItemId ?? items[0]?.productId;

  const onApply = useCallback(
    (requestId: string, value: string) => {
      if (!productId) return Promise.reject(new Error("Chưa chọn sản phẩm để đổi màu."));
      return tryonApi.variantColor(requestId, value, productId);
    },
    [productId],
  );
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
      items={data ? items.map((item) => ({ id: item.productId, label: item.name || item.category, currentValue: item.selectedColor })) : undefined}
      selectedItemId={productId}
      onSelectItem={setPickedItemId}
      currentValueLabel="Màu hiện tại"
      itemsLoading={isLoading}
      itemsError={!!error}
      onRetryItems={() => void refetch()}
    />
  );
}
