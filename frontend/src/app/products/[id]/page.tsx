"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { productApi } from "@/services/product-api";
import { Badge } from "@/components/ui/badge";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { ErrorState } from "@/components/common/ErrorState";
import {
  ProductImageGalleryProvider,
  ProductImageMain,
  ProductImageThumbnails,
} from "@/components/product/ProductImageGallery";
import { ProductDetailLayout } from "@/components/product/ProductDetailLayout";
import { ProductDetailActions } from "@/components/product/ProductDetailActions";
import { formatPrice } from "@/utils/format-price";
import { useConsultationStore } from "@/stores/consultation-store";
import { useEnsureSession } from "@/hooks/use-ensure-session";
import { useRouter, useSearchParams } from "next/navigation";
import { recommendationApi } from "@/services/recommendation-api";
import { OutfitAiExplanationCard } from "@/components/ai/OutfitAiExplanationCard";
import { AI_RESULT_FROM_PARAM, RECOMMENDATION_PARAM, TRYON_FROM_PARAM } from "@/lib/nav-context";
import { useTryOnAddItem } from "@/hooks/use-tryon-add-item";
import { productToTryOnItem } from "@/lib/tryon-product";
import { PageShell } from "@/components/layout/PageShell";
import { ProductPageBackLink } from "@/components/layout/ProductPageBackLink";
import { PageSuspense } from "@/components/common/PageSuspense";
import { cn } from "@/lib/utils";
import { pageTitle, consumerPageShellClass, productDetailInfoColumnClass, productDetailSummaryClass } from "@/lib/design-tokens";

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <PageSuspense>
      <ProductDetailContent params={params} />
    </PageSuspense>
  );
}

function ProductDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromAiResult = searchParams.get("from") === AI_RESULT_FROM_PARAM;
  const fromTryOn = searchParams.get("from") === TRYON_FROM_PARAM;
  const recommendationId = searchParams.get(RECOMMENDATION_PARAM);
  const { setSelectedProductId } = useConsultationStore();
  const { ensureSession } = useEnsureSession();
  const { addItem: addToTryOn, ReplaceConfirmDialog } = useTryOnAddItem();

  const { data: product, isLoading, error, refetch } = useQuery({
    queryKey: ["product", id],
    queryFn: () => productApi.getById(id),
  });

  const { data: recommendation } = useQuery({
    queryKey: ["recommendation", recommendationId],
    queryFn: () => recommendationApi.getById(recommendationId!),
    enabled: fromAiResult && !!recommendationId,
  });

  const handleConsult = async () => {
    await ensureSession();
    setSelectedProductId(id);
    router.push("/ai/body-profile");
  };

  if (isLoading) {
    return (
      <PageShell width="full" className={consumerPageShellClass}>
        <LoadingSkeleton type="detail" />
      </PageShell>
    );
  }

  if (error || !product) {
    return (
      <PageShell width="full" className={consumerPageShellClass}>
        <ErrorState onRetry={() => refetch()} />
      </PageShell>
    );
  }

  const handleTryOn = () => {
    addToTryOn(productToTryOnItem(product), { onSuccess: () => router.push("/try-on") });
  };

  const actions = (
    <ProductDetailActions
      productId={product.id}
      aiTryOnEligible={product.aiTryOnEligible}
      onConsult={handleConsult}
      onTryOn={fromTryOn && product.aiTryOnEligible ? handleTryOn : undefined}
    />
  );

  return (
    <PageShell width="full" className={cn(consumerPageShellClass, "pb-8 sm:pb-10")}>
      {ReplaceConfirmDialog}
      <ProductPageBackLink className="mb-3 sm:mb-4" />
      <ProductImageGalleryProvider
        images={product.images}
        imageDetails={product.imageDetails}
        alt={product.name}
      >
        <ProductDetailLayout
          media={<ProductImageMain />}
          mediaThumbnails={<ProductImageThumbnails />}
          actions={actions}
          aiExplanation={
            fromAiResult && recommendation ? (
              <OutfitAiExplanationCard
                recommendation={recommendation}
                productId={product.id}
                className="w-full"
              />
            ) : undefined
          }
        >
          <div className={productDetailInfoColumnClass}>
            <div className={productDetailSummaryClass}>
              <p className="text-sm text-muted-foreground">{product.brandName}</p>
              <h1 className={pageTitle}>{product.name}</h1>
              <p className="text-2xl font-semibold">{formatPrice(product.price)}</p>

              <div className="flex flex-wrap gap-2">
                {product.colors.map((c) => (
                  <Badge key={c} variant="outline">{c}</Badge>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((s) => (
                  <Badge key={s} variant="secondary">{s}</Badge>
                ))}
              </div>

              {product.material && (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  <strong>Chất liệu:</strong> {product.material}
                </p>
              )}

              {product.description && (
                <p className="leading-relaxed text-muted-foreground">{product.description}</p>
              )}
            </div>

            {product.sizeCharts && product.sizeCharts.length > 0 && (
              <div>
                <h2 className="font-semibold text-foreground">Bảng size</h2>
                <div className="mt-3 overflow-x-auto rounded-2xl border border-border/60">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-4 py-3 text-left">Size</th>
                        <th className="px-4 py-3 text-left">Ngực (cm)</th>
                        <th className="px-4 py-3 text-left">Eo (cm)</th>
                        <th className="px-4 py-3 text-left">Hông (cm)</th>
                        <th className="px-4 py-3 text-left">Cao (cm)</th>
                        <th className="px-4 py-3 text-left">Cân (kg)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {product.sizeCharts.map((row) => (
                        <tr key={row.sizeLabel} className="border-t">
                          <td className="px-4 py-3 font-medium">{row.sizeLabel}</td>
                          <td className="px-4 py-3">{row.chestCm ?? "—"}</td>
                          <td className="px-4 py-3">{row.waistCm ?? "—"}</td>
                          <td className="px-4 py-3">{row.hipCm ?? "—"}</td>
                          <td className="px-4 py-3">
                            {row.heightMinCm != null && row.heightMaxCm != null
                              ? `${row.heightMinCm}–${row.heightMaxCm}`
                              : "—"}
                          </td>
                          <td className="px-4 py-3">
                            {row.weightMinKg != null && row.weightMaxKg != null
                              ? `${row.weightMinKg}–${row.weightMaxKg}`
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </ProductDetailLayout>
      </ProductImageGalleryProvider>
    </PageShell>
  );
}
