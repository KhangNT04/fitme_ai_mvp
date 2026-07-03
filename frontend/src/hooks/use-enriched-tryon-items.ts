import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { productApi } from "@/services/product-api";
import type { TryOnItem } from "@/types/tryon";

function needsProductEnrichment(items: TryOnItem[]): boolean {
  return items.some((item) => !item.name?.trim() || !item.imageUrl);
}

export function useEnrichedTryOnItems(items: TryOnItem[]) {
  const shouldEnrich = needsProductEnrichment(items);

  const queries = useQueries({
    queries: items.map((item) => ({
      queryKey: ["product", item.productId],
      queryFn: () => productApi.getById(item.productId),
      enabled: shouldEnrich && Boolean(item.productId),
      staleTime: 5 * 60 * 1000,
    })),
  });

  const enrichedItems = useMemo(() => {
    if (!shouldEnrich) return items;

    return items.map((item, index) => {
      const product = queries[index]?.data;
      if (!product) return item;

      const imageUrl = item.imageUrl || product.images[0];
      const selectedSize =
        item.selectedSize ?? item.suggestedSize ?? item.size ?? product.sizes[0];
      const selectedColor = item.selectedColor ?? item.color ?? product.colors[0];

      return {
        ...item,
        name: item.name?.trim() ? item.name : product.name,
        category: item.category || product.category,
        imageUrl,
        price: item.price ?? product.price,
        selectedSize,
        suggestedSize: item.suggestedSize ?? product.sizes[0],
        size: selectedSize,
        color: selectedColor,
        selectedColor,
      };
    });
  }, [items, queries, shouldEnrich]);

  const isEnriching = shouldEnrich && queries.some((query) => query.isLoading);

  return { items: enrichedItems, isEnriching };
}
