"use client";

import { ProductCard } from "@/components/common/ProductCard";
import { BrandProductRowSection } from "@/components/catalog/BrandProductRowSection";
import { tryOnBrandPath } from "@/lib/discover-brand";
import type { Brand } from "@/types/brand";
import type { Product } from "@/types/product";
import type { TryOnItem } from "@/types/tryon";

interface BrandTryOnSectionProps {
  brand?: Brand;
  products: Product[];
  onSelectProduct: (item: TryOnItem) => void;
}

function toSelectedItem(product: Product): TryOnItem {
  return {
    productId: product.id,
    category: product.category,
    name: product.name,
    imageUrl: product.images[0],
  };
}

export function BrandTryOnSection({ brand, products, onSelectProduct }: BrandTryOnSectionProps) {
  return (
    <BrandProductRowSection
      brand={brand}
      products={products}
      getBrandHref={tryOnBrandPath}
      renderProduct={(p) => (
        <div
          role="button"
          tabIndex={0}
          className="w-full cursor-pointer text-left"
          onClick={() => onSelectProduct(toSelectedItem(p))}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelectProduct(toSelectedItem(p));
            }
          }}
        >
          <ProductCard product={p} showTryOn={false} size="catalog" detailContext="tryon" />
        </div>
      )}
    />
  );
}
