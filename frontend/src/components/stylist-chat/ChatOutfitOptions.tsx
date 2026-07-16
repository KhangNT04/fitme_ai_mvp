"use client";

import { ChatOutfitCard } from "./ChatOutfitCard";
import type { RecommendationResult, StyleRecommendationOption } from "@/types/outfit";

interface ChatOutfitOptionsProps {
  content: string;
  options?: StyleRecommendationOption[];
  recommendations?: RecommendationResult[];
}

export function ChatOutfitOptions({ content, options, recommendations }: ChatOutfitOptionsProps) {
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
          <ChatOutfitCard key={rec.id} recommendation={rec} />
        ))}
      </div>
    </div>
  );
}
