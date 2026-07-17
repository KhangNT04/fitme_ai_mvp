"use client";

import { ChatOutfitCard } from "./ChatOutfitCard";
import type { RecommendationResult, StyleRecommendationOption } from "@/types/outfit";

interface ChatOutfitOptionsProps {
  content: string;
  options?: StyleRecommendationOption[];
  recommendations?: RecommendationResult[];
  compact?: boolean;
}

export function ChatOutfitOptions({
  content,
  options,
  recommendations,
  compact = true,
}: ChatOutfitOptionsProps) {
  const cards =
    recommendations && recommendations.length > 0
      ? recommendations
      : (options || []).map(
          (opt): RecommendationResult => ({
            id: opt.recommendationId,
            title: opt.title,
            styleLabel: opt.styleLabel,
            confidence: "MEDIUM",
            outfitItems: [],
            explanation: {
              bodyFit: "",
              styleFit: "",
              occasionFit: "",
              colorFit: "",
            },
          }),
        );

  return (
    <div className="space-y-3">
      <p className="whitespace-pre-line text-sm leading-relaxed">{content}</p>
      <div className="space-y-3">
        {cards.map((rec) => (
          <ChatOutfitCard key={rec.id} recommendation={rec} defaultExpanded={!compact} />
        ))}
      </div>
    </div>
  );
}
