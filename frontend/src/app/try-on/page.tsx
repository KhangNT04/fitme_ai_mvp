"use client";

import { useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { productApi } from "@/services/product-api";
import { publicBrandApi } from "@/services/brand-api";
import { Badge } from "@/components/ui/badge";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
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
import { groupProductsByBrand } from "@/lib/group-products-by-brand";

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

  const { data: brands = [] } = useQuery({
    queryKey: ["brands", "public"],
    queryFn: () => publicBrandApi.list(),
  });

  const brandMap = useMemo(() => new Map(brands.map((b) => [b.id, b])), [brands]);

  const { data, isLoading } = useQuery({
    queryKey: ["products-tryon"],
    queryFn: () => productApi.list({ aiTryOnEligible: true }),
  });

  const sortedBrandGroups = useMemo(() => {
    if (!data?.items.length) return [];
    const groups = groupProductsByBrand(data.items);
    return [...groups.entries()].sort((a, b) => {
      const nameA = brandMap.get(a[0])?.name ?? a[1][0]?.brandName ?? "";
      const nameB = brandMap.get(b[0])?.name ?? b[1][0]?.brandName ?? "";
      return nameA.localeCompare(nameB, "vi");
    });
  }, [data, brandMap]);

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
        {isLoading ? (
          <LoadingSkeleton />
        ) : (
          sortedBrandGroups.map(([id, products]) => (
            <BrandTryOnSection
              key={id}
              brand={brandMap.get(id)}
              products={products}
              selectedProductIds={selectedProductIds}
              onSelectProduct={addItem}
            />
          ))
        )}
      </div>
    </PageShell>
  );
}
