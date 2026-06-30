"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { catalogProductRowClass, catalogProductRowItemClass } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import type { Brand } from "@/types/brand";
import type { Product } from "@/types/product";

export interface BrandProductRowSectionProps {
  brand?: Brand;
  products: Product[];
  getBrandHref: (brandId: string) => string;
  renderProduct: (product: Product) => ReactNode;
}

function BrandSectionHeader({
  brand,
  count,
  getBrandHref,
}: {
  brand?: Brand;
  count: number;
  getBrandHref: (brandId: string) => string;
}) {
  const name = brand?.name ?? "Thương hiệu";
  const href = brand?.id ? getBrandHref(brand.id) : undefined;

  const inner = (
    <>
      {brand?.logoUrl ? (
        <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-border/50 bg-white sm:h-10 sm:w-10">
          <Image src={brand.logoUrl} alt="" fill className="object-cover" sizes="40px" unoptimized />
        </div>
      ) : (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary sm:h-10 sm:w-10">
          {name.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="min-w-0">
        <h2 className="truncate font-display text-base font-bold text-foreground">{name}</h2>
        <p className="text-xs text-muted-foreground">{count} sản phẩm</p>
      </div>
    </>
  );

  return (
    <div className="mb-2 flex items-center justify-between gap-2 border-b border-border/40 pb-1.5 sm:mb-2.5 sm:pb-2">
      {href ? (
        <Link
          href={href}
          className={cn(
            "flex min-w-0 items-center gap-2 rounded-lg px-1 py-0.5 transition-colors",
            "hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
          )}
          aria-label={`Xem tất cả sản phẩm ${name}`}
        >
          {inner}
        </Link>
      ) : (
        <div className="flex min-w-0 items-center gap-2 px-1 py-0.5">{inner}</div>
      )}
      <p className="hidden shrink-0 text-[10px] text-muted-foreground sm:block sm:text-xs">Lướt ngang</p>
    </div>
  );
}

export function BrandProductRowSection({
  brand,
  products,
  getBrandHref,
  renderProduct,
}: BrandProductRowSectionProps) {
  return (
    <section>
      <BrandSectionHeader brand={brand} count={products.length} getBrandHref={getBrandHref} />
      <div
        className={catalogProductRowClass}
        aria-label={`Sản phẩm ${brand?.name ?? "thương hiệu"}`}
      >
        {products.map((p) => (
          <div key={p.id} className={catalogProductRowItemClass}>
            {renderProduct(p)}
          </div>
        ))}
      </div>
    </section>
  );
}
