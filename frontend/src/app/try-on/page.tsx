"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { productApi } from "@/services/product-api";
import { ProductCard } from "@/components/common/ProductCard";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTryOnStore } from "@/stores/tryon-store";
import { TRY_ON_CATEGORIES } from "@/utils/constants";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { TRYON_FLOW_STEPS } from "@/components/layout/FlowStepper";
import { PageSuspense } from "@/components/common/PageSuspense";

export default function TryOnPage() {
  return (
    <PageSuspense>
      <TryOnContent />
    </PageSuspense>
  );
}

function TryOnContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = searchParams.get("product");
  const { selectedItems, addItem, removeItem } = useTryOnStore();

  const { data, isLoading } = useQuery({
    queryKey: ["products-tryon"],
    queryFn: () => productApi.list({ aiTryOnEligible: true }),
  });

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
    <PageShell width="full">
      <PageHeader
        steps={TRYON_FLOW_STEPS}
        currentStep={1}
        title="Thử mặc bằng AI"
        subtitle="Chọn item để tạo preview thử mặc minh họa 2D"
        showAiBadge
        backHref="/discover"
        backLabel="Khám phá sản phẩm"
      />

      {selectedItems.length > 0 && (
        <div className="mb-6 rounded-2xl border border-border/60 bg-muted/80 p-4 shadow-sm">
          <p className="text-sm font-medium">Đã chọn ({selectedItems.length})</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {selectedItems.map((item) => (
              <Badge key={item.productId} variant="secondary" className="cursor-pointer" onClick={() => removeItem(item.productId)}>
                {item.name} ×
              </Badge>
            ))}
          </div>
          <Button className="mt-4" onClick={() => router.push("/try-on/selected")}>
            Tiếp tục thử outfit
          </Button>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {TRY_ON_CATEGORIES.map((c) => (
          <Badge key={c.value} variant="outline">{c.label}</Badge>
        ))}
      </div>

      <div className="mt-8">
        {isLoading ? <LoadingSkeleton /> : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data?.items.map((p) => (
              <div key={p.id} onClick={() => addItem({
                productId: p.id,
                category: p.category,
                name: p.name,
                imageUrl: p.images[0],
              })}>
                <ProductCard product={p} showTryOn={false} compact />
              </div>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
