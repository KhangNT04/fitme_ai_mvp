"use client";

import { useEffect, useRef, useState } from "react";
import { ProductCard } from "@/components/common/ProductCard";
import { BrandProductRowSection } from "@/components/catalog/BrandProductRowSection";
import { discoverBrandPath } from "@/lib/discover-brand";
import { prefetchImages } from "@/lib/prefetch-images";
import type { Brand } from "@/types/brand";
import type { Product } from "@/types/product";

interface BrandDiscoverSectionProps {
  brand?: Brand;
  products: Product[];
  /** Full brand catalog size when `products` is the newest preview. */
  totalCount?: number;
  /** Eager-load images for this row (above-the-fold / near viewport). */
  prioritizeImages?: boolean;
}

export function BrandDiscoverSection({
  brand,
  products,
  totalCount,
  prioritizeImages = false,
}: BrandDiscoverSectionProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [nearViewport, setNearViewport] = useState(prioritizeImages);

  useEffect(() => {
    if (prioritizeImages) {
      setNearViewport(true);
      return;
    }
    const node = rootRef.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setNearViewport(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setNearViewport(true);
        prefetchImages(products.flatMap((p) => p.images.slice(0, 2)));
        observer.disconnect();
      },
      // Start loading well before the row enters the screen.
      { rootMargin: "600px 200px", threshold: 0.01 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [prioritizeImages, products]);

  const eager = prioritizeImages || nearViewport;

  return (
    <div ref={rootRef}>
      <BrandProductRowSection
        brand={brand}
        products={products}
        totalCount={totalCount}
        getBrandHref={discoverBrandPath}
        renderProduct={(p, index) => (
          <ProductCard
            product={p}
            size="catalog"
            // First cards in above-fold rows get true priority; near-viewport rows load eager.
            imagePriority={prioritizeImages && index < 5}
            imageEager={eager}
          />
        )}
      />
    </div>
  );
}
