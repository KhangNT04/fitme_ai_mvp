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
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-stone-900">Thử mặc bằng AI</h1>
      <p className="mt-2 text-stone-500">Chọn item để tạo preview thử mặc minh họa 2D</p>

      {selectedItems.length > 0 && (
        <div className="mt-6 rounded-lg border border-stone-200 bg-stone-50 p-4">
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
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data?.items.map((p) => (
              <div key={p.id} onClick={() => addItem({
                productId: p.id,
                category: p.category,
                name: p.name,
                imageUrl: p.images[0],
              })}>
                <ProductCard product={p} showTryOn={false} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
