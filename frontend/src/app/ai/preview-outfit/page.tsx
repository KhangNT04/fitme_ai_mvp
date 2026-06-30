"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Plus, Check } from "lucide-react";
import { recommendationApi } from "@/services/recommendation-api";
import { productApi } from "@/services/product-api";
import { wardrobeApi } from "@/services/wardrobe-api";
import { useConsultationStore } from "@/stores/consultation-store";
import { PreviewOutfitTray } from "@/components/ai/PreviewOutfitTray";
import { ProductCard } from "@/components/common/ProductCard";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { ErrorState } from "@/components/common/ErrorState";
import { PageSuspense } from "@/components/common/PageSuspense";
import { PageShell } from "@/components/layout/PageShell";
import { FlowWizardToolbar } from "@/components/layout/FlowWizardToolbar";
import { AI_FLOW_STEPS } from "@/components/layout/FlowStepper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { catalogProductGridClass, consumerPageShellClass } from "@/lib/design-tokens";
import {
  hasOutfitItem,
  productToOutfitItem,
  wardrobeToOutfitItem,
} from "@/lib/outfit-item-utils";
import { cn } from "@/lib/utils";

export default function PreviewOutfitPage() {
  return (
    <PageSuspense>
      <PreviewOutfitContent />
    </PageSuspense>
  );
}

function PreviewOutfitContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const recommendationId = searchParams.get("recommendation");
  const [tab, setTab] = useState("catalog");

  const {
    draft,
    initPreviewOutfit,
    addPreviewOutfitItem,
    removePreviewOutfitItem,
  } = useConsultationStore();

  const selectedItems = draft.previewOutfitItems ?? [];

  const recommendationQuery = useQuery({
    queryKey: ["recommendation", recommendationId],
    queryFn: () => recommendationApi.getById(recommendationId!),
    enabled: !!recommendationId,
  });

  const catalogQuery = useQuery({
    queryKey: ["products-preview-outfit"],
    queryFn: () => productApi.list({ aiTryOnEligible: true }),
  });

  const similarQuery = useQuery({
    queryKey: ["similar-products", recommendationId],
    queryFn: () => recommendationApi.getSimilarProducts(recommendationId!),
    enabled: !!recommendationId,
  });

  const wardrobeQuery = useQuery({
    queryKey: ["wardrobe-items"],
    queryFn: () => wardrobeApi.list(),
  });

  useEffect(() => {
      if (recommendationQuery.data && recommendationId) {
        initPreviewOutfit(recommendationId, recommendationQuery.data.outfitItems);
      }
    },
    [recommendationQuery.data, recommendationId, initPreviewOutfit],
  );

  if (!recommendationId) {
    router.replace("/ai/start");
    return null;
  }

  if (recommendationQuery.isLoading) {
    return (
      <PageShell width="full" className={consumerPageShellClass}>
        <LoadingSkeleton type="detail" />
      </PageShell>
    );
  }

  if (recommendationQuery.error || !recommendationQuery.data) {
    return (
      <PageShell width="full" className={consumerPageShellClass}>
        <ErrorState onRetry={() => recommendationQuery.refetch()} />
      </PageShell>
    );
  }

  const handleContinue = () => {
    router.push(`/ai/photo-upload?recommendation=${recommendationId}`);
  };

  return (
    <PageShell width="full" className={consumerPageShellClass}>
      <FlowWizardToolbar
        steps={AI_FLOW_STEPS}
        currentStep={4}
        title="Chỉnh set outfit"
        subtitle="Thêm hoặc bớt món trước khi tạo preview 2D"
        showAiBadge
        backHref={`/ai/result/${recommendationId}`}
        backLabel="Kết quả tư vấn"
      />

      <Card>
        <CardContent className="p-4 sm:p-5">
          <PreviewOutfitTray
            items={selectedItems}
            onRemove={removePreviewOutfitItem}
          />
        </CardContent>
      </Card>

      <section className="mt-6">
        <h2 className="mb-3 font-display text-base font-bold text-foreground sm:text-lg">
          Thêm món vào set
        </h2>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-4 grid w-full grid-cols-3">
            <TabsTrigger value="catalog">Khám phá</TabsTrigger>
            <TabsTrigger value="similar">Tương tự</TabsTrigger>
            <TabsTrigger value="wardrobe">Tủ đồ</TabsTrigger>
          </TabsList>

          <TabsContent value="catalog">
            {catalogQuery.isLoading ? (
              <LoadingSkeleton count={4} />
            ) : (
              <div className={catalogProductGridClass}>
                {catalogQuery.data?.items.map((product) => {
                  const outfitItem = productToOutfitItem(product);
                  const selected = hasOutfitItem(selectedItems, outfitItem);
                  return (
                    <div key={product.id} className="relative">
                      {selected && (
                        <div className="pointer-events-none absolute inset-0 z-10 rounded-xl ring-2 ring-primary ring-offset-2" />
                      )}
                      <button
                        type="button"
                        className="block w-full text-left"
                        onClick={() =>
                          selected
                            ? removePreviewOutfitItem(product.id)
                            : addPreviewOutfitItem(outfitItem)
                        }
                      >
                        <ProductCard product={product} showTryOn={false} size="catalog" />
                      </button>
                      <Button
                        type="button"
                        size="sm"
                        variant={selected ? "secondary" : "outline"}
                        className="absolute bottom-14 right-2 z-20 h-7 px-2 text-[10px] sm:bottom-16 sm:text-xs"
                        onClick={() =>
                          selected
                            ? removePreviewOutfitItem(product.id)
                            : addPreviewOutfitItem(outfitItem)
                        }
                      >
                        {selected ? (
                          <>
                            <Check className="mr-1 h-3 w-3" />Đã chọn
                          </>
                        ) : (
                          <>
                            <Plus className="mr-1 h-3 w-3" />Thêm
                          </>
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="similar">
            {similarQuery.isLoading ? (
              <LoadingSkeleton count={4} />
            ) : similarQuery.data && similarQuery.data.length > 0 ? (
              <div className={catalogProductGridClass}>
                {similarQuery.data.map((product) => {
                  const outfitItem = productToOutfitItem(product);
                  const selected = hasOutfitItem(selectedItems, outfitItem);
                  return (
                    <div key={product.id} className="relative">
                      <button
                        type="button"
                        className={cn("block w-full text-left", selected && "opacity-80")}
                        onClick={() =>
                          selected
                            ? removePreviewOutfitItem(product.id)
                            : addPreviewOutfitItem(outfitItem)
                        }
                      >
                        <ProductCard product={product} showTryOn={false} size="catalog" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Chưa có sản phẩm tương tự. Thử tab Khám phá để thêm món.
              </p>
            )}
          </TabsContent>

          <TabsContent value="wardrobe">
            {wardrobeQuery.isLoading ? (
              <LoadingSkeleton count={3} />
            ) : wardrobeQuery.data && wardrobeQuery.data.length > 0 ? (
              <div className="space-y-2">
                {wardrobeQuery.data.map((item) => {
                  const outfitItem = wardrobeToOutfitItem(item);
                  const key = item.id;
                  const selected = hasOutfitItem(selectedItems, outfitItem);
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-white p-3"
                    >
                      <div>
                        <p className="text-xs text-muted-foreground">{item.category}</p>
                        <p className="font-medium">{item.itemType}</p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant={selected ? "secondary" : "outline"}
                        onClick={() =>
                          selected
                            ? removePreviewOutfitItem(key)
                            : addPreviewOutfitItem(outfitItem)
                        }
                      >
                        {selected ? "Bỏ" : "Thêm"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Tủ đồ trống. Thêm item trong mục Tủ đồ hoặc chọn sản phẩm từ Khám phá.
              </p>
            )}
          </TabsContent>
        </Tabs>
      </section>

      <Button
        className="mt-8 w-full min-h-11 pb-mobile-nav md:pb-0"
        size="lg"
        variant="ai"
        disabled={selectedItems.length === 0}
        onClick={handleContinue}
      >
        Tiếp tục upload ảnh ({selectedItems.length} món)
      </Button>
    </PageShell>
  );
}
