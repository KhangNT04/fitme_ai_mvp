import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Giải thích AI cho outfit</CardTitle>
        {outfitItem && (
          <p className="text-sm text-muted-foreground">
            Món <strong className="text-foreground">{outfitItem.name}</strong> trong set{" "}
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

        <div className="space-y-2.5 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">Phù hợp dáng:</strong>{" "}
            {recommendation.explanation.bodyFit}
          </p>
          <p>
            <strong className="text-foreground">Phù hợp gu:</strong>{" "}
            {recommendation.explanation.styleFit}
          </p>
          <p>
            <strong className="text-foreground">Phù hợp hoàn cảnh:</strong>{" "}
            {recommendation.explanation.occasionFit}
          </p>
          <p>
            <strong className="text-foreground">Gợi ý màu:</strong>{" "}
            {recommendation.explanation.colorFit}
          </p>
          {recommendation.explanation.wardrobeUsage && (
            <p>
              <strong className="text-foreground">Tủ đồ:</strong>{" "}
              {recommendation.explanation.wardrobeUsage}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
