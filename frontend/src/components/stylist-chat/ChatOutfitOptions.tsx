"use client";

import { useEffect, useState } from "react";
import { StyleBoardSection } from "./StyleResultsBoard";
import { recommendationApi } from "@/services/recommendation-api";
import { toStyleDisplayLabel } from "@/lib/style-display-label";
import { aiOutfitBoardShellClass, aiOutfitCardStackClass } from "@/lib/design-tokens";
import type { RecommendationResult, StyleRecommendationOption } from "@/types/outfit";

interface ChatOutfitOptionsProps {
  content: string;
  options?: StyleRecommendationOption[];
  recommendations?: RecommendationResult[];
  /** Kept for call-site compatibility; chat now always uses the board layout. */
  compact?: boolean;
}

function withDisplayLabels(rec: RecommendationResult): RecommendationResult {
  const styleLabel = toStyleDisplayLabel(rec.styleLabel) || rec.styleLabel;
  return styleLabel === rec.styleLabel ? rec : { ...rec, styleLabel };
}

function usableRecommendations(list?: RecommendationResult[]): RecommendationResult[] {
  return (list || [])
    .filter((rec) => (rec.outfitItems?.length ?? 0) > 0)
    .map(withDisplayLabels);
}

export function ChatOutfitOptions({
  content,
  options,
  recommendations,
}: ChatOutfitOptionsProps) {
  const initial = usableRecommendations(recommendations);
  const [cards, setCards] = useState<RecommendationResult[]>(initial);
  const [hydrating, setHydrating] = useState(false);

  useEffect(() => {
    const fromPayload = usableRecommendations(recommendations);
    if (fromPayload.length > 0) {
      setCards(fromPayload);
      return;
    }

    const ids = (options || [])
      .map((opt) => opt.recommendationId)
      .filter(Boolean);
    if (ids.length === 0) {
      setCards([]);
      return;
    }

    let cancelled = false;
    setHydrating(true);
    void Promise.all(
      ids.map((id) =>
        recommendationApi.getById(id).catch(() => null),
      ),
    )
      .then((loaded) => {
        if (cancelled) return;
        const next = usableRecommendations(
          loaded.filter((rec): rec is RecommendationResult => Boolean(rec)),
        );
        // Prefer option display labels (already VN from starter/chat) when present.
        setCards(
          next.map((rec, index) => {
            const optLabel = options?.[index]?.styleLabel;
            const styleLabel =
              toStyleDisplayLabel(optLabel) || optLabel || toStyleDisplayLabel(rec.styleLabel) || rec.styleLabel;
            return styleLabel ? { ...rec, styleLabel } : rec;
          }),
        );
      })
      .finally(() => {
        if (!cancelled) setHydrating(false);
      });

    return () => {
      cancelled = true;
    };
  }, [recommendations, options]);

  return (
    <div className="space-y-3">
      <p className="whitespace-pre-line text-sm leading-relaxed">{content}</p>
      {hydrating && cards.length === 0 && (
        <p className="text-xs text-muted-foreground">Đang tải sản phẩm trong set…</p>
      )}
      {cards.length > 0 ? (
        <div className={aiOutfitBoardShellClass}>
          <div className={aiOutfitCardStackClass}>
            {cards.map((rec, index) => (
              <StyleBoardSection key={rec.id} recommendation={rec} index={index} />
            ))}
          </div>
        </div>
      ) : (
        !hydrating && (
          <p className="text-xs text-muted-foreground">
            Chưa có sản phẩm trong gợi ý này — bạn thử nhắn lại dịp mặc cụ thể hơn nhé.
          </p>
        )
      )}
    </div>
  );
}
