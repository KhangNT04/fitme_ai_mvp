"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { productApi } from "@/services/product-api";
import { publicBrandApi } from "@/services/brand-api";
import { Input } from "@/components/ui/input";
import { ProductCard } from "@/components/common/ProductCard";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { PageShell } from "@/components/layout/PageShell";
import { FlowWizardToolbar } from "@/components/layout/FlowWizardToolbar";
import { TRYON_FLOW_STEPS } from "@/components/layout/FlowStepper";
import { TryOnSelectionBar } from "@/components/tryon/TryOnSelectionBar";
import { catalogProductGridClass, consumerPageShellClass } from "@/lib/design-tokens";
import { useTryOnStore } from "@/stores/tryon-store";
import type { Product } from "@/types/product";
import type { TryOnItem } from "@/types/tryon";

function toSelectedItem(product: Product): TryOnItem {
  return {
    productId: product.id,
    category: product.category,
    name: product.name,
    imageUrl: product.images[0],
  };
}

export default function TryOnBrandPage() {
  const params = useParams<{ id: string }>();
  const brandId = params.id;
  const { addItem } = useTryOnStore();
  const [search, setSearch] = useState("");

  const {
    data: brand,
    isLoading: brandLoading,
    error: brandError,
    refetch: refetchBrand,
  } = useQuery({
    queryKey: ["brands", "public", brandId],
    queryFn: () => publicBrandApi.getById(brandId),
    enabled: !!brandId,
  });

  const { data, isLoading: productsLoading, error: productsError, refetch: refetchProducts } = useQuery({
    queryKey: ["products", "tryon", "brand", brandId, search],
    queryFn: () =>
      productApi.list({
        brandId,
        search: search || undefined,
        aiTryOnEligible: true,
      }),
    enabled: !!brandId,
  });

  const isLoading = brandLoading || productsLoading;
  const error = brandError || productsError;
  const refetch = () => {
    void refetchBrand();
    void refetchProducts();
  };

  const brandName = brand?.name ?? "Thương hiệu";
  const productCount = useMemo(() => data?.items.length ?? 0, [data?.items.length]);

  return (
    <PageShell width="full" className={consumerPageShellClass}>
      <FlowWizardToolbar
        steps={TRYON_FLOW_STEPS}
        currentStep={1}
        title={brandName}
        subtitle={data ? `${productCount} sản phẩm thử AI` : "Đang tải..."}
        showAiBadge
        backHref="/try-on"
        backLabel="Thử mặc"
        trailing={
          <Input
            placeholder="Tìm trong thương hiệu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 min-w-0 flex-1 rounded-full border-border/60 bg-white px-2.5 text-xs sm:h-9 sm:w-40 sm:flex-none sm:px-3 sm:text-sm"
          />
        }
      />

      <TryOnSelectionBar />

      {brand && (
        <div className="mb-4 flex items-center gap-3 border-b border-border/40 pb-3 sm:mb-5 sm:gap-4 sm:pb-4">
          {brand.logoUrl ? (
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-border/50 bg-white sm:h-14 sm:w-14">
              <Image src={brand.logoUrl} alt="" fill className="object-cover" sizes="56px" unoptimized />
            </div>
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary sm:h-14 sm:w-14">
              {brandName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <h2 className="truncate font-display text-lg font-bold text-foreground sm:text-xl">{brandName}</h2>
            {brand.description && (
              <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{brand.description}</p>
            )}
          </div>
        </div>
      )}

      <div>
        {isLoading && <LoadingSkeleton />}
        {error && <ErrorState onRetry={() => refetch()} />}
        {data && data.items.length === 0 && (
          <EmptyState
            title="Không có sản phẩm thử AI"
            description="Thương hiệu này chưa có sản phẩm hỗ trợ thử mặc AI phù hợp tìm kiếm."
          />
        )}
        {data && data.items.length > 0 && (
          <div className={catalogProductGridClass}>
            {data.items.map((p) => (
              <div
                key={p.id}
                role="button"
                tabIndex={0}
                className="w-full cursor-pointer text-left"
                onClick={() => addItem(toSelectedItem(p))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    addItem(toSelectedItem(p));
                  }
                }}
              >
                <ProductCard product={p} showTryOn={false} size="catalog" detailContext="tryon" />
              </div>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
