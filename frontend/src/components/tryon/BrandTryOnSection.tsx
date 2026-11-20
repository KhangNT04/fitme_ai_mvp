"use client";

import { memo, useCallback } from "react";
import { ProductCard } from "@/components/common/ProductCard";
import { BrandProductRowSection } from "@/components/catalog/BrandProductRowSection";
import { tryOnBrandPath } from "@/lib/discover-brand";
import { productToTryOnItem } from "@/lib/tryon-product";
import type { Brand } from "@/types/brand";
import type { Product } from "@/types/product";
import type { TryOnItem } from "@/types/tryon";

interface BrandTryOnSectionProps {
  brand?: Brand;
  products: Product[];
  totalCount?: number;
  selectedProductIds?: Set<string>;
  onSelectProduct: (item: TryOnItem) => void;
  loadEagerImages?: boolean;
  rowIndex?: number;
}

export const BrandTryOnSection = memo(function BrandTryOnSection({
  brand,
  products,
  totalCount,
  selectedProductIds,
  onSelectProduct,
  loadEagerImages = false,
  rowIndex = 0,
}: BrandTryOnSectionProps) {
  const handleSelect = useCallback(
    (product: Product) => {
      onSelectProduct(productToTryOnItem(product));
    },
    [onSelectProduct],
  );

  return (
    <BrandProductRowSection
      brand={brand}
      products={products}
      totalCount={totalCount}
      getBrandHref={tryOnBrandPath}
      renderProduct={(p, index) => (
        <ProductCard
          product={p}
          showTryOn={false}
          size="catalog"
          detailContext="tryon"
          imagePriority={loadEagerImages && rowIndex < 2 && index < 4}
          imageEager={loadEagerImages}
          tryOnPicker={{
            selected: selectedProductIds?.has(p.id) ?? false,
            onSelect: () => handleSelect(p),
          }}
        />
      )}
    />
  );
});
