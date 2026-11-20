"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { productApi } from "@/services/product-api";
import { publicBrandApi } from "@/services/brand-api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { BrandTryOnSection } from "@/components/tryon/BrandTryOnSection";
import { TryOnSelectionBar } from "@/components/tryon/TryOnSelectionBar";
import { useTryOnAddItem } from "@/hooks/use-tryon-add-item";
import { useTryOnStore } from "@/stores/tryon-store";
import { TRY_ON_CATEGORIES } from "@/utils/constants";
import { PageShell } from "@/components/layout/PageShell";
import { FlowWizardToolbar } from "@/components/layout/FlowWizardToolbar";
import { TRYON_FLOW_STEPS } from "@/components/layout/FlowStepper";
import { PageSuspense } from "@/components/common/PageSuspense";
import { consumerPageShellClass } from "@/lib/design-tokens";
import {
  CATALOG_EAGER_BRAND_ROWS,
  TRYON_BRANDS_PER_PAGE,
  TRYON_PRODUCTS_PER_BRAND,
  groupNewestProductsByBrand,
} from "@/lib/group-products-by-brand";
import { prefetchImages } from "@/lib/prefetch-images";

export default function TryOnPage() {
  return (
    <PageSuspense>
      <TryOnContent />
    </PageSuspense>
  );
}

function TryOnContent() {
  const searchParams = useSearchParams();
  const productId = searchParams.get("product");
  const { addItem, ReplaceConfirmDialog } = useTryOnAddItem();
  const selectedItems = useTryOnStore((s) => s.selectedItems);
  const selectedProductIds = useMemo(
    () => new Set(selectedItems.map((item) => item.productId)),
    [selectedItems],
  );
  const [brandPage, setBrandPage] = useState(0);

  const { data: brands = [] } = useQuery({
    queryKey: ["brands", "public"],
    queryFn: () => publicBrandApi.list(),
  });

  const brandMap = useMemo(() => new Map(brands.map((b) => [b.id, b])), [brands]);

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["products-tryon", TRYON_PRODUCTS_PER_BRAND],
    queryFn: () =>
      productApi.list({
        aiTryOnEligible: true,
        limitPerBrand: TRYON_PRODUCTS_PER_BRAND,
      }),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

  const sortedBrandGroups = useMemo(() => {
    if (!data?.items.length) return [];
    const groups = groupNewestProductsByBrand(data.items, TRYON_PRODUCTS_PER_BRAND);
    return [...groups.entries()].sort((a, b) => {
      const nameA = brandMap.get(a[0])?.name ?? a[1].products[0]?.brandName ?? "";
      const nameB = brandMap.get(b[0])?.name ?? b[1].products[0]?.brandName ?? "";
      return nameA.localeCompare(nameB, "vi");
    });
  }, [data, brandMap]);

  const brandPageCount = Math.max(1, Math.ceil(sortedBrandGroups.length / TRYON_BRANDS_PER_PAGE));
  const safeBrandPage = Math.min(brandPage, brandPageCount - 1);

  const pagedBrandGroups = useMemo(() => {
    const start = safeBrandPage * TRYON_BRANDS_PER_PAGE;
    return sortedBrandGroups.slice(start, start + TRYON_BRANDS_PER_PAGE);
  }, [sortedBrandGroups, safeBrandPage]);

  useEffect(() => {
    if (pagedBrandGroups.length === 0) return;
    prefetchImages(
      pagedBrandGroups
        .slice(0, CATALOG_EAGER_BRAND_ROWS)
        .flatMap(([, preview]) => preview.products.map((p) => p.images[0])),
      6,
    );
  }, [pagedBrandGroups]);

  const goToBrandPage = useCallback((next: number) => {
    setBrandPage(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (productId && data?.items) {
      const product = data.items.find((p) => p.id === productId);
      if (product) {
        addItem({
          productId: product.id,
          category: product.category,
          name: product.name,
          imageUrl: product.images[0],
        });
      }
    }
  }, [productId, data, addItem]);

  return (
    <PageShell width="full" className={consumerPageShellClass}>
      {ReplaceConfirmDialog}
      <FlowWizardToolbar
        steps={TRYON_FLOW_STEPS}
        currentStep={1}
        title="Thử mặc bằng AI"
        subtitle="Mỗi loại (áo, quần, giày...) chỉ chọn 1 sản phẩm — không cần đủ set vẫn thử được"
        showAiBadge
        backHref="/discover"
        backLabel="Khám phá"
      />

      <TryOnSelectionBar />

      <div className="mt-3 flex flex-wrap gap-1.5 sm:mt-4 sm:gap-2">
        {TRY_ON_CATEGORIES.map((c) => (
          <Badge key={c.value} variant="outline" className="text-[10px] sm:text-xs">
            {c.label}
          </Badge>
        ))}
      </div>

      <div className="mt-4 space-y-10 sm:mt-6">
        {isLoading && <LoadingSkeleton type="brand-rows" count={3} />}
        {error && !data && <ErrorState onRetry={() => refetch()} />}
        {data && data.items.length === 0 && (
          <EmptyState
            title="Chưa có sản phẩm thử AI"
            description="Quay lại khám phá hoặc thử thương hiệu khác."
          />
        )}
        {pagedBrandGroups.length > 0 && (
          <div
            className={
              isFetching && !isLoading ? "space-y-10 opacity-70 transition-opacity duration-200" : "space-y-10"
            }
          >
            {pagedBrandGroups.map(([id, preview], rowIndex) => (
              <BrandTryOnSection
                key={id}
                brand={brandMap.get(id)}
                products={preview.products}
                totalCount={preview.total}
                selectedProductIds={selectedProductIds}
                onSelectProduct={addItem}
                loadEagerImages={rowIndex < CATALOG_EAGER_BRAND_ROWS}
                rowIndex={rowIndex}
              />
            ))}
          </div>
        )}

        {sortedBrandGroups.length > TRYON_BRANDS_PER_PAGE && (
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="rounded-full"
              aria-label="Trang brand trước"
              disabled={safeBrandPage === 0}
              onClick={() => goToBrandPage(safeBrandPage - 1)}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
            <p className="text-sm text-muted-foreground">
              Trang {safeBrandPage + 1} / {brandPageCount}
              <span className="hidden sm:inline">
                {" "}
                · {sortedBrandGroups.length} thương hiệu · {TRYON_BRANDS_PER_PAGE}/trang
              </span>
            </p>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="rounded-full"
              aria-label="Trang brand sau"
              disabled={safeBrandPage + 1 >= brandPageCount}
              onClick={() => goToBrandPage(safeBrandPage + 1)}
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        )}
      </div>
    </PageShell>
  );
}
