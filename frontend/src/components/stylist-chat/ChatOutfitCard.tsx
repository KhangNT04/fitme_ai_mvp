"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Camera, ShoppingBag, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppImage } from "@/components/common/AppImage";
import { OutfitAiExplanationCard } from "@/components/ai/OutfitAiExplanationCard";
import { seedTryOnFromOutfitItems } from "@/lib/seed-tryon-from-recommendation";
import { recommendationApi } from "@/services/recommendation-api";
import { toast } from "@/stores/toast-store";
import type { RecommendationResult } from "@/types/outfit";

interface ChatOutfitCardProps {
  recommendation: RecommendationResult;
}

export function ChatOutfitCard({ recommendation }: ChatOutfitCardProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [buyOpen, setBuyOpen] = useState(false);
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
      </div>

      <div className="grid grid-cols-3 gap-1.5 px-3 pb-2 sm:grid-cols-4">
        {recommendation.outfitItems.slice(0, 4).map((item) => (
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
          variant="outline"
          className="gap-1.5"
          onClick={() => setBuyOpen((v) => !v)}
          disabled={buyable.length === 0}
        >
          <ShoppingBag className="h-3.5 w-3.5" />
          Mua từng món
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

      {buyOpen && buyable.length > 0 && (
        <ul className="space-y-1 border-t border-border/50 px-3 py-2">
          {buyable.map((item) => (
            <li key={item.id}>
              <Link
                href={`/products/${item.productId}?from=ai-chat`}
                className="text-xs text-primary underline-offset-2 hover:underline"
              >
                {item.name}
                {item.price != null ? ` — ${item.price.toLocaleString("vi-VN")}đ` : ""}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
