"use client";

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
  selectedProductIds?: Set<string>;
  onSelectProduct: (item: TryOnItem) => void;
}

export function BrandTryOnSection({ brand, products, selectedProductIds, onSelectProduct }: BrandTryOnSectionProps) {
  return (
    <BrandProductRowSection
      brand={brand}
      products={products}
      getBrandHref={tryOnBrandPath}
      renderProduct={(p) => (
        <ProductCard
          product={p}
          showTryOn={false}
          size="catalog"
          detailContext="tryon"
          tryOnPicker={{
            selected: selectedProductIds?.has(p.id) ?? false,
            onSelect: () => onSelectProduct(productToTryOnItem(p)),
          }}
        />
      )}
    />
  );
}
