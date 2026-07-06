import type { RecommendationExplanation } from "@/types/outfit";

/** Fallback when API has no `summary` (older recommendations). */
export function resolveOutfitExplanationSummary(explanation: RecommendationExplanation): string {
  if (explanation.summary?.trim()) {
    return explanation.summary.trim();
  }

  const parts = [
    explanation.bodyFit,
    explanation.styleFit,
    explanation.occasionFit,
    explanation.colorFit,
    explanation.wardrobeUsage,
  ]
    .map((part) => part?.trim())
    .filter(Boolean) as string[];

  if (parts.length === 0) {
    return "Em đã ghép set này dựa trên thông tin bạn cung cấp — bạn thử trước, cần chỉnh gì cứ nhắn em nhé.";
  }

  return parts
    .map((part) => (part.endsWith(".") ? part : `${part}.`))
    .join(" ");
}
