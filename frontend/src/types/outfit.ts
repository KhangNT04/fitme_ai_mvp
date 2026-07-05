export type ConfidenceLevel = "LOW" | "MEDIUM" | "HIGH";
export type PreviewType = "OUTFIT_BOARD" | "AVATAR" | "USER_PHOTO_2D";

export interface OutfitItem {
  id: string;
  productId?: string;
  wardrobeItemId?: string;
  name: string;
  category: string;
  color: string;
  size?: string;
  price?: number;
  imageUrl?: string;
  fromWardrobe: boolean;
  purchaseUrl?: string;
}

export interface RecommendationExplanation {
  bodyFit: string;
  styleFit: string;
  occasionFit: string;
  colorFit: string;
  wardrobeUsage?: string;
}

export interface PreviewInfo {
  type: PreviewType;
  imageUrl?: string;
  disclaimer: string;
}

export interface RecommendationResult {
  id: string;
  title: string;
  recommendedSize?: string;
  alternativeSize?: string;
  recommendedForm?: string;
  recommendedColor?: string;
  confidence: ConfidenceLevel;
  stylistSource?: "gemini" | "rule";
  outfitItems: OutfitItem[];
  explanation: RecommendationExplanation;
  preview?: PreviewInfo;
}

export interface CreateRecommendationRequest {
  sessionId: string;
  selectedProductId?: string | null;
  occasion?: string;
  desiredVibe?: string;
  wardrobeMode: import("./user").WardrobeMode;
  budgetMin?: number;
  budgetMax?: number;
}
