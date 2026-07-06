import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { resolveOutfitExplanationSummary } from "@/lib/outfit-explanation";
import type { RecommendationResult } from "@/types/outfit";

interface OutfitAiExplanationCardProps {
  recommendation: RecommendationResult;
  /** Highlight when viewing a specific product from the outfit set. */
  productId?: string;
  className?: string;
}

export function OutfitAiExplanationCard({
  recommendation,
  productId,
  className,
}: OutfitAiExplanationCardProps) {
  const outfitItem = productId
    ? recommendation.outfitItems.find((item) => item.productId === productId)
    : undefined;
  const advice = resolveOutfitExplanationSummary(recommendation.explanation);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Tư vấn outfit</CardTitle>
        {outfitItem && (
          <p className="text-sm text-muted-foreground">
            Gợi ý cho món <strong className="text-foreground">{outfitItem.name}</strong> trong set{" "}
            <strong className="text-foreground">{recommendation.title}</strong>
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {recommendation.recommendedSize && (
            <Badge variant="secondary">Gợi ý size: {recommendation.recommendedSize}</Badge>
          )}
          {recommendation.recommendedForm && (
            <Badge variant="outline">Form: {recommendation.recommendedForm}</Badge>
          )}
          {recommendation.recommendedColor && (
            <Badge variant="outline">Màu: {recommendation.recommendedColor}</Badge>
          )}
          <Badge variant={recommendation.confidence === "HIGH" ? "success" : "warning"}>
            Độ tin cậy: {recommendation.confidence}
          </Badge>
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground">{advice}</p>
      </CardContent>
    </Card>
  );
}
