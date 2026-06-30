"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Save, Camera, ShoppingBag, Sparkles } from "lucide-react";
import { recommendationApi } from "@/services/recommendation-api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OutfitAiExplanationCard } from "@/components/ai/OutfitAiExplanationCard";
import { AppImage } from "@/components/common/AppImage";
import { ProductCard } from "@/components/common/ProductCard";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { ErrorState } from "@/components/common/ErrorState";
import { Disclaimer } from "@/components/layout/Disclaimer";
import { PageShell } from "@/components/layout/PageShell";
import { FlowWizardToolbar } from "@/components/layout/FlowWizardToolbar";
import { AI_FLOW_STEPS } from "@/components/layout/FlowStepper";
import { catalogProductGridClass, consumerPageShellClass } from "@/lib/design-tokens";
import {
  outfitItemDetailHref,
  outfitItemShowPrice,
  outfitItemToProduct,
} from "@/lib/outfit-product-mapper";
import type { OutfitItem } from "@/types/outfit";

function outfitItemMeta(item: OutfitItem): string | undefined {
  const parts = [
    item.size ? `Size ${item.size}` : null,
    item.color || null,
    item.category || null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

function OutfitItemGrid({ items, recommendationId }: { items: OutfitItem[]; recommendationId: string }) {
  return (
    <div className={catalogProductGridClass}>
      {items.map((item) => (
        <ProductCard
          key={item.id}
          product={outfitItemToProduct(item)}
          size="catalog"
          href={outfitItemDetailHref(item, recommendationId)}
          hidePrice={!outfitItemShowPrice(item)}
          meta={outfitItemMeta(item)}
          showTryOn={!item.fromWardrobe && !!item.productId}
          imageBadge={
            item.fromWardrobe ? (
              <Badge
                variant="success"
                className="absolute left-1.5 top-1.5 z-10 px-1.5 py-0 text-[9px] shadow-md sm:left-2 sm:top-2 sm:px-2 sm:text-[10px]"
              >
                Bạn đã có
              </Badge>
            ) : undefined
          }
        />
      ))}
    </div>
  );
}

export default function AiResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["recommendation", id],
    queryFn: () => recommendationApi.getById(id),
  });

  if (isLoading) {
    return (
      <PageShell width="full" className={consumerPageShellClass}>
        <LoadingSkeleton type="detail" />
      </PageShell>
    );
  }

  if (error || !data) {
    return (
      <PageShell width="full" className={consumerPageShellClass}>
        <ErrorState onRetry={() => refetch()} />
      </PageShell>
    );
  }

  return (
    <PageShell width="full" className={consumerPageShellClass}>
      <FlowWizardToolbar
        steps={AI_FLOW_STEPS}
        currentStep={4}
        title={data.title}
        showAiBadge
        backHref="/discover"
        backLabel="Khám phá sản phẩm"
      />

      <div className="flex flex-wrap gap-2">
        {data.recommendedSize && <Badge>Gợi ý size: {data.recommendedSize}</Badge>}
        {data.recommendedForm && <Badge variant="secondary">Form: {data.recommendedForm}</Badge>}
        {data.recommendedColor && <Badge variant="outline">Màu: {data.recommendedColor}</Badge>}
        <Badge variant={data.confidence === "HIGH" ? "success" : "warning"}>
          Độ tin cậy: {data.confidence}
        </Badge>
      </div>

      {data.preview?.imageUrl && (
        <div className="relative mt-6 aspect-[4/5] overflow-hidden rounded-xl bg-muted">
          <AppImage src={data.preview.imageUrl} alt="Preview outfit" fill className="object-cover" />
        </div>
      )}

      <Disclaimer className="mt-6" />

      <section className="mt-8">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Outfit gợi ý</p>
            <h2 className="font-display text-lg font-bold text-foreground sm:text-xl">
              {data.outfitItems.length} món trong set
            </h2>
          </div>
        </div>
        <OutfitItemGrid items={data.outfitItems} recommendationId={id} />
      </section>

      <OutfitAiExplanationCard recommendation={data} className="mt-8" />

      <div className="mt-8 flex flex-wrap gap-3 pb-mobile-nav md:pb-0">
        <Button
          onClick={async () => {
            await recommendationApi.save(id);
            await queryClient.invalidateQueries({ queryKey: ["saved-outfits"] });
          }}
        >
          <Save className="mr-2 h-4 w-4" />Lưu gợi ý
        </Button>
        <Button variant="ai" asChild>
          <Link href={`/ai/preview-outfit?recommendation=${id}`}>
            <Camera className="mr-2 h-4 w-4" />Upload ảnh tạo preview 2D
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/similar-products?recommendation=${id}`}>
            <Sparkles className="mr-2 h-4 w-4" />Sản phẩm tương tự
          </Link>
        </Button>
        <Button variant="ai" asChild>
          <Link href={`/ai/variants/${id}`}>
            <ShoppingBag className="mr-2 h-4 w-4" />Thử biến thể
          </Link>
        </Button>
      </div>
    </PageShell>
  );
}
