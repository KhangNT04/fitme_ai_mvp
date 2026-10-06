"use client";

import { use, useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { tryonApi } from "@/services/tryon-api";
import { TryOnVariantShell } from "@/components/tryon/TryOnVariantShell";
import { useTryOnVariant } from "@/hooks/use-tryon-variant";

const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

export default function TryOnSizePage({ params }: { params: Promise<{ id: string }> }) {
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
      if (!productId) return Promise.reject(new Error("Chưa chọn sản phẩm để đổi size."));
      return tryonApi.variantSize(requestId, value, productId);
    },
    [productId],
  );
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
      items={data ? items.map((item) => ({ id: item.productId, label: item.name || item.category, currentValue: item.selectedSize })) : undefined}
      selectedItemId={productId}
      onSelectItem={setPickedItemId}
      currentValueLabel="Size hiện tại"
      itemsLoading={isLoading}
      itemsError={!!error}
      onRetryItems={() => void refetch()}
    />
  );
}
