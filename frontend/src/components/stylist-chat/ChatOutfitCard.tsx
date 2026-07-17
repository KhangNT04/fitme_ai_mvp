"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Camera, ChevronDown, Save } from "lucide-react";
import { ProductCard } from "@/components/common/ProductCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppImage } from "@/components/common/AppImage";
import { OutfitAiExplanationCard } from "@/components/ai/OutfitAiExplanationCard";
import { catalogProductRowClass, catalogProductRowItemClass } from "@/lib/design-tokens";
import { seedTryOnFromOutfitItems } from "@/lib/seed-tryon-from-recommendation";
import { productDetailFromAiChatHref } from "@/lib/nav-context";
import { productApi } from "@/services/product-api";
import { recommendationApi } from "@/services/recommendation-api";
import { toast } from "@/stores/toast-store";
import type { OutfitItem, RecommendationResult } from "@/types/outfit";

function RecommendedProductCard({ item }: { item: OutfitItem }) {
  const { data: product, isLoading } = useQuery({
    queryKey: ["product", item.productId],
    queryFn: () => productApi.getById(item.productId!),
    enabled: Boolean(item.productId),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-xl border border-border/50 bg-white">
        <div className="aspect-[4/5] animate-pulse bg-muted" />
        <div className="space-y-2 p-2">
          <div className="h-2.5 w-1/2 animate-pulse rounded bg-muted" />
          <div className="h-3 w-4/5 animate-pulse rounded bg-muted" />
          <div className="h-3 w-2/5 animate-pulse rounded bg-muted" />
          <div className="h-7 animate-pulse rounded bg-muted" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="overflow-hidden rounded-xl border border-border/50 bg-white">
        <div className="relative aspect-[4/5] bg-muted">
          {item.imageUrl ? (
            <AppImage src={item.imageUrl} alt={item.name} fill className="object-cover" sizes="192px" />
          ) : null}
        </div>
        <div className="p-2">
          <p className="line-clamp-2 text-xs font-semibold">{item.name}</p>
          {item.price != null && (
            <p className="mt-1 text-xs font-bold">{item.price.toLocaleString("vi-VN")} ₫</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <ProductCard
      product={product}
      size="catalog"
      showTryOn={false}
      href={productDetailFromAiChatHref(product.id)}
    />
  );
}

const EXPANDED_STORAGE_KEY = "fitme-chat-outfit-expanded";

function readExpandedMap(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(EXPANDED_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

function writeExpanded(recommendationId: string, expanded: boolean): void {
  if (typeof window === "undefined") return;
  const next = { ...readExpandedMap(), [recommendationId]: expanded };
  sessionStorage.setItem(EXPANDED_STORAGE_KEY, JSON.stringify(next));
}

function initialExpanded(recommendationId: string, defaultExpanded: boolean): boolean {
  const saved = readExpandedMap()[recommendationId];
  return typeof saved === "boolean" ? saved : defaultExpanded;
}

interface ChatOutfitCardProps {
  recommendation: RecommendationResult;
  defaultExpanded?: boolean;
}

export function ChatOutfitCard({
  recommendation,
  defaultExpanded = false,
}: ChatOutfitCardProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(() =>
    initialExpanded(recommendation.id, defaultExpanded),
  );
  const buyable = recommendation.outfitItems.filter((i) => i.productId && !i.fromWardrobe);

  const handleTryOn = () => {
    const count = seedTryOnFromOutfitItems(recommendation.outfitItems);
    if (count === 0) {
      toast.error("Outfit này chưa có sản phẩm thương hiệu để thử mặc.");
      return;
    }
    toast.success(`Đã chọn ${count} món — tiếp tục upload ảnh thử mặc`);
    router.push("/try-on/input");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await recommendationApi.save(recommendation.id);
      toast.success("Đã lưu gợi ý");
    } catch {
      toast.error("Không lưu được gợi ý.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="overflow-hidden rounded-xl border border-border/60 bg-background"
      data-recommendation-id={recommendation.id}
    >
      <div className="flex items-start gap-3 p-3">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
          {recommendation.outfitItems[0]?.imageUrl ? (
            <AppImage
              src={recommendation.outfitItems[0].imageUrl}
              alt={recommendation.title}
              fill
              className="object-cover"
              sizes="64px"
            />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {recommendation.styleLabel && (
              <Badge variant="secondary" className="text-[10px]">
                {recommendation.styleLabel}
              </Badge>
            )}
            {recommendation.recommendedSize && (
              <Badge variant="outline" className="text-[10px]">
                Size {recommendation.recommendedSize}
              </Badge>
            )}
          </div>
          <h4 className="mt-1 truncate text-sm font-semibold">{recommendation.title}</h4>
          <p className="text-xs text-muted-foreground">
            {recommendation.outfitItems.length} món trong set
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="shrink-0 gap-1 px-2 text-xs"
          aria-expanded={expanded}
          onClick={() => {
            setExpanded((value) => {
              const next = !value;
              writeExpanded(recommendation.id, next);
              return next;
            });
          }}
        >
          {expanded ? "Thu gọn" : "Xem chi tiết"}
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </Button>
      </div>

      {expanded && (
        <>
          {buyable.length > 0 && (
            <div className="border-t border-border/50 px-3 py-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Sản phẩm trong outfit</p>
              <div className={catalogProductRowClass} aria-label="Sản phẩm được tư vấn">
                {buyable.map((item) => (
                  <div key={item.id} className={catalogProductRowItemClass}>
                    <RecommendedProductCard item={item} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {recommendation.outfitItems.some((item) => item.fromWardrobe) && (
            <div className="grid grid-cols-3 gap-1.5 px-3 pb-3 sm:grid-cols-4">
              {recommendation.outfitItems.filter((item) => item.fromWardrobe).map((item) => (
                <div key={item.id} className="overflow-hidden rounded-md border border-border/40 bg-muted/40">
                  <div className="relative aspect-square">
                    {item.imageUrl ? (
                      <AppImage src={item.imageUrl} alt={item.name} fill className="object-cover" sizes="80px" />
                    ) : null}
                  </div>
                  <p className="truncate px-1 py-0.5 text-[10px] text-muted-foreground">{item.name}</p>
                </div>
              ))}
            </div>
          )}

          <div className="px-3 pb-2">
            <OutfitAiExplanationCard recommendation={recommendation} className="border-0 shadow-none" />
          </div>

          <div className="flex flex-wrap gap-2 border-t border-border/50 p-3">
            <Button type="button" size="sm" variant="ai" className="gap-1.5" onClick={handleTryOn}>
              <Camera className="h-3.5 w-3.5" />
              Mặc thử outfit
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="gap-1.5"
              disabled={saving}
              onClick={() => void handleSave()}
            >
              <Save className="h-3.5 w-3.5" />
              Lưu
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
