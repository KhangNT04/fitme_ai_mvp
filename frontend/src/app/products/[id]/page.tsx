"use client";

import Link from "next/link";
import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { productApi } from "@/services/product-api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { ErrorState } from "@/components/common/ErrorState";
import { ProductImageGallery } from "@/components/product/ProductImageGallery";
import { formatPrice } from "@/utils/format-price";
import { useConsultationStore } from "@/stores/consultation-store";
import { useEnsureSession } from "@/hooks/use-ensure-session";
import { useRouter, useSearchParams } from "next/navigation";
import { recommendationApi } from "@/services/recommendation-api";
import { OutfitAiExplanationCard } from "@/components/ai/OutfitAiExplanationCard";
import { AI_RESULT_FROM_PARAM, RECOMMENDATION_PARAM } from "@/lib/nav-context";
import { PageShell } from "@/components/layout/PageShell";
import { ProductPageBackLink } from "@/components/layout/ProductPageBackLink";
import { PageSuspense } from "@/components/common/PageSuspense";
import { pageTitle } from "@/lib/design-tokens";

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
  const recommendationId = searchParams.get(RECOMMENDATION_PARAM);
  const { setSelectedProductId } = useConsultationStore();
  const { ensureSession } = useEnsureSession();

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
      <PageShell width="full">
        <LoadingSkeleton type="detail" />
      </PageShell>
    );
  }

  if (error || !product) {
    return (
      <PageShell width="full">
        <ErrorState onRetry={() => refetch()} />
      </PageShell>
    );
  }

  return (
    <PageShell width="full">
      <ProductPageBackLink className="mb-3 sm:mb-4" />
      <div className="grid gap-8 lg:grid-cols-2">
        <ProductImageGallery
          images={product.images}
          imageDetails={product.imageDetails}
          alt={product.name}
        />
        <div>
          <p className="text-sm text-muted-foreground">{product.brandName}</p>
          <h1 className={pageTitle}>{product.name}</h1>
          <p className="mt-4 text-2xl font-semibold">{formatPrice(product.price)}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            {product.colors.map((c) => (
              <Badge key={c} variant="outline">{c}</Badge>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {product.sizes.map((s) => (
              <Badge key={s} variant="secondary">{s}</Badge>
            ))}
          </div>

          {product.material && (
            <p className="mt-4 text-sm text-muted-foreground"><strong>Chất liệu:</strong> {product.material}</p>
          )}

          {product.description && (
            <p className="mt-6 text-muted-foreground">{product.description}</p>
          )}

          {product.sizeCharts && product.sizeCharts.length > 0 && (
            <div className="mt-6">
              <h2 className="font-semibold text-foreground">Bảng size</h2>
              <div className="mt-2 overflow-x-auto rounded-2xl border border-border/60">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-3 py-2 text-left">Size</th>
                      <th className="px-3 py-2 text-left">Ngực (cm)</th>
                      <th className="px-3 py-2 text-left">Eo (cm)</th>
                      <th className="px-3 py-2 text-left">Hông (cm)</th>
                      <th className="px-3 py-2 text-left">Cao (cm)</th>
                      <th className="px-3 py-2 text-left">Cân (kg)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {product.sizeCharts.map((row) => (
                      <tr key={row.sizeLabel} className="border-t">
                        <td className="px-3 py-2 font-medium">{row.sizeLabel}</td>
                        <td className="px-3 py-2">{row.chestCm ?? "—"}</td>
                        <td className="px-3 py-2">{row.waistCm ?? "—"}</td>
                        <td className="px-3 py-2">{row.hipCm ?? "—"}</td>
                        <td className="px-3 py-2">
                          {row.heightMinCm != null && row.heightMaxCm != null
                            ? `${row.heightMinCm}–${row.heightMaxCm}`
                            : "—"}
                        </td>
                        <td className="px-3 py-2">
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

          <div className="mt-8 flex flex-wrap gap-3">
            <Button variant="ai" onClick={handleConsult}>
              <Sparkles className="mr-2 h-4 w-4" />
              Tư vấn size & phối đồ bằng AI
            </Button>
            {product.aiTryOnEligible && (
              <Button variant="outline" asChild>
                <Link href={`/try-on?product=${product.id}`}>Thử mặc bằng AI</Link>
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link href={`/redirect/confirm/${product.id}`}>Mua ngay</Link>
            </Button>
          </div>

          {fromAiResult && recommendation && (
            <OutfitAiExplanationCard
              recommendation={recommendation}
              productId={product.id}
              className="mt-6"
            />
          )}
        </div>
      </div>
    </PageShell>
  );
}
