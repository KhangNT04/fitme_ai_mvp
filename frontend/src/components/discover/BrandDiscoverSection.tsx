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
}

export function BrandDiscoverSection({ brand, products, totalCount }: BrandDiscoverSectionProps) {
  return (
    <BrandProductRowSection
      brand={brand}
      products={products}
      totalCount={totalCount}
      getBrandHref={discoverBrandPath}
      renderProduct={(p) => <ProductCard product={p} size="catalog" />}
    />
  );
}
