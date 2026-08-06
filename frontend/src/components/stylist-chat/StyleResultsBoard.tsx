"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Camera, Save, ThumbsDown, ThumbsUp } from "lucide-react";
import { ProductCard } from "@/components/common/ProductCard";
import { AppImage } from "@/components/common/AppImage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OutfitAiExplanationCard } from "@/components/ai/OutfitAiExplanationCard";
import {
  aiOutfitBoardShellClass,
  aiOutfitCardStackClass,
  catalogProductRowClass,
  catalogProductRowItemClass,
} from "@/lib/design-tokens";
import { seedTryOnFromOutfitItems } from "@/lib/seed-tryon-from-recommendation";
import { productDetailFromAiChatHref } from "@/lib/nav-context";
import { productApi } from "@/services/product-api";
import { recommendationApi } from "@/services/recommendation-api";
import { toast } from "@/stores/toast-store";
import { getUserErrorMessage } from "@/lib/user-error-message";
import { toStyleDisplayLabel } from "@/lib/style-display-label";
import type { OutfitItem, RecommendationResult } from "@/types/outfit";

function BoardProductCard({ item }: { item: OutfitItem }) {
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
      showTryOn
      href={productDetailFromAiChatHref(product.id)}
    />
  );
}

function sizeTip(recommendation: RecommendationResult): string | null {
  if (!recommendation.recommendedSize) return null;
  const alt = recommendation.alternativeSize
    ? ` · dự phòng ${recommendation.alternativeSize}`
    : "";
  return `Size gợi ý: ${recommendation.recommendedSize}${alt}`;
}

interface StyleBoardSectionProps {
  recommendation: RecommendationResult;
  /** Position within the current list of outfit cards — renders a small number badge for quick scanning. */
  index?: number;
}

export function StyleBoardSection({ recommendation, index }: StyleBoardSectionProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<"LIKE" | "DISLIKE" | null>(null);
  const buyable = recommendation.outfitItems.filter((i) => i.productId && !i.fromWardrobe);
  const tip = sizeTip(recommendation);
  const label =
    toStyleDisplayLabel(recommendation.styleLabel) || recommendation.styleLabel || recommendation.title;

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
      toast.success("Đã lưu gợi ý — FitMe sẽ nhớ phong cách này hơn");
    } catch {
      toast.error("Không lưu được gợi ý.");
    } finally {
      setSaving(false);
    }
  };

  const handleFeedback = async (rating: "LIKE" | "DISLIKE") => {
    if (feedback) return;
    try {
      await recommendationApi.feedback(recommendation.id, rating);
      setFeedback(rating);
      toast.success(
        rating === "LIKE"
          ? "Đã thích — lần sau FitMe nghiêng về phong cách này hơn"
          : "Đã ghi nhận — sẽ ít gợi ý kiểu này hơn",
      );
    } catch (e) {
      toast.error(getUserErrorMessage(e, "Không gửi được feedback."));
    }
  };

  return (
    <section
      className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm"
      data-recommendation-id={recommendation.id}
      aria-label={`Gợi ý ${label}`}
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-muted/50 px-3 py-2.5 sm:px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          {typeof index === "number" && (
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground"
              aria-hidden
            >
              {index + 1}
            </span>
          )}
          <div className="min-w-0">
            <h3 className="truncate font-display text-base font-bold text-foreground">{label}</h3>
            <p className="truncate text-xs text-muted-foreground">
              {recommendation.title !== label ? recommendation.title : `${recommendation.outfitItems.length} món trong set`}
            </p>
          </div>
        </div>
        {tip && (
          <Badge
            variant="secondary"
            className="shrink-0 bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100"
          >
            {tip}
          </Badge>
        )}
      </header>

      <div className="space-y-3 p-3 sm:p-4">
        {buyable.length > 0 ? (
          <div className={catalogProductRowClass} aria-label={`Sản phẩm ${label}`}>
            {buyable.map((item) => (
              <div key={item.id} className={catalogProductRowItemClass}>
                <BoardProductCard item={item} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Chưa có sản phẩm thương hiệu trong set này.</p>
        )}

        <OutfitAiExplanationCard recommendation={recommendation} className="border-0 bg-transparent shadow-none" />

        <div className="flex flex-wrap gap-2">
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
          <Button
            type="button"
            size="sm"
            variant={feedback === "LIKE" ? "secondary" : "ghost"}
            className="gap-1.5"
            disabled={feedback !== null}
            onClick={() => void handleFeedback("LIKE")}
            aria-label="Thích outfit"
          >
            <ThumbsUp className="h-3.5 w-3.5" />
            Thích
          </Button>
          <Button
            type="button"
            size="sm"
            variant={feedback === "DISLIKE" ? "secondary" : "ghost"}
            className="gap-1.5"
            disabled={feedback !== null}
            onClick={() => void handleFeedback("DISLIKE")}
            aria-label="Không thích outfit"
          >
            <ThumbsDown className="h-3.5 w-3.5" />
            Pass
          </Button>
        </div>
      </div>
    </section>
  );
}

interface StyleResultsBoardProps {
  recommendations: RecommendationResult[];
  loading?: boolean;
}

export function StyleResultsBoard({ recommendations, loading }: StyleResultsBoardProps) {
  if (loading) {
    return (
      <div className={aiOutfitBoardShellClass}>
        <div>
          <div className="h-5 w-48 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-3 w-64 animate-pulse rounded bg-muted" />
        </div>
        <div className={aiOutfitCardStackClass}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
              <div className="h-11 animate-pulse bg-muted/50" />
              <div className="flex gap-2.5 overflow-hidden p-3 sm:p-4">
                {[0, 1, 2].map((j) => (
                  <div key={j} className="w-[10.75rem] shrink-0 sm:w-48">
                    <div className="aspect-[4/5] animate-pulse rounded-xl bg-muted" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) return null;

  const usable = recommendations.filter((rec) => rec.outfitItems.length > 0);

  return (
    <div className={aiOutfitBoardShellClass}>
      <div>
        <h2 className="font-display text-lg font-bold text-foreground">
          {recommendations.length} style cơ bản cho bạn
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {recommendations
            .map((rec) => toStyleDisplayLabel(rec.styleLabel) || rec.styleLabel)
            .filter(Boolean)
            .join(" · ") || "Đi làm · Đi chơi · Thể thao"}{" "}
          — xem set trước, chat thêm bên dưới nếu cần
        </p>
      </div>
      <div className={aiOutfitCardStackClass}>
        {usable.map((rec, index) => (
          <StyleBoardSection key={rec.id} recommendation={rec} index={index} />
        ))}
      </div>
    </div>
  );
}
