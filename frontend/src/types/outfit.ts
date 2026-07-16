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
  summary?: string;
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
  styleLabel?: string;
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

export interface StyleRecommendationOption {
  recommendationId: string;
  styleLabel: string;
  title: string;
  previewImageUrl?: string;
  itemCount: number;
  stylistSource?: string;
}

export interface RecommendationOptionsResult {
  requestId: string;
  options: StyleRecommendationOption[];
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
