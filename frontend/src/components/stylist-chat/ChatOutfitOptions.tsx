"use client";

import { useEffect, useMemo, useState } from "react";
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
  const fromPayload = useMemo(() => usableRecommendations(recommendations), [recommendations]);
  const idsKey = (options || [])
    .map((opt) => opt.recommendationId)
    .filter(Boolean)
    .join(",");
  const needsFetch = fromPayload.length === 0 && idsKey !== "";
  const [fetched, setFetched] = useState<{ key: string; cards: RecommendationResult[] } | null>(null);

  useEffect(() => {
    if (!needsFetch) return;
    let cancelled = false;
    void Promise.all(
      idsKey.split(",").map((id) =>
        recommendationApi.getById(id).catch(() => null),
      ),
    ).then((loaded) => {
      if (cancelled) return;
      const next = usableRecommendations(
        loaded.filter((rec): rec is RecommendationResult => Boolean(rec)),
      );
      // Prefer option display labels (already VN from starter/chat) when present.
      setFetched({
        key: idsKey,
        cards: next.map((rec, index) => {
          const optLabel = options?.[index]?.styleLabel;
          const styleLabel =
            toStyleDisplayLabel(optLabel) || optLabel || toStyleDisplayLabel(rec.styleLabel) || rec.styleLabel;
          return styleLabel ? { ...rec, styleLabel } : rec;
        }),
      });
    });

    return () => {
      cancelled = true;
    };
  }, [needsFetch, idsKey, options]);

  const fetchedCards = fetched?.key === idsKey ? fetched.cards : null;
  const cards = fromPayload.length > 0 ? fromPayload : (fetchedCards ?? []);
  const hydrating = needsFetch && fetchedCards === null;

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
