"use client";

import { ProductCard } from "@/components/common/ProductCard";
import { BrandProductRowSection } from "@/components/catalog/BrandProductRowSection";
import { discoverBrandPath } from "@/lib/discover-brand";
import type { Brand } from "@/types/brand";
import type { Product } from "@/types/product";

interface BrandDiscoverSectionProps {
  brand?: Brand;
  products: Product[];
  /** Full brand catalog size when `products` is the newest preview. */
  totalCount?: number;
  /**
   * Load every card image on this page immediately (Discover brand pages).
   * `priority` still marks the first few above-the-fold cards for LCP.
   */
  loadAllImages?: boolean;
  /** Row index within the current page — used for LCP priority. */
  rowIndex?: number;
}

export function BrandDiscoverSection({
  brand,
  products,
  totalCount,
  loadAllImages = false,
  rowIndex = 0,
}: BrandDiscoverSectionProps) {
  return (
    <BrandProductRowSection
      brand={brand}
      products={products}
      totalCount={totalCount}
      getBrandHref={discoverBrandPath}
      renderProduct={(p, index) => (
        <ProductCard
          product={p}
          size="catalog"
          imagePriority={loadAllImages && rowIndex < 2 && index < 4}
          imageEager={loadAllImages}
        />
      )}
    />
  );
}
