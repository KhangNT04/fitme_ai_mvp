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
  /** Eager-load the first few card images (above-the-fold rows). */
  prioritizeImages?: boolean;
}

export function BrandDiscoverSection({
  brand,
  products,
  totalCount,
  prioritizeImages = false,
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
          imagePriority={prioritizeImages && index < 4}
        />
      )}
    />
  );
}
