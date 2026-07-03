export type TryOnStatus = "DRAFT" | "PROCESSING" | "COMPLETED" | "FAILED";
export type TryOnInputMode = "USER_PHOTO" | "AVATAR" | "OUTFIT_BOARD_ONLY";
export type TryOnPreviewType = "OUTFIT_BOARD" | "AVATAR" | "USER_PHOTO_2D";

export interface TryOnItem {
  productId: string;
  category: string;
  name: string;
  imageUrl?: string;
  color?: string;
  size?: string;
  role?: string;
  selectedSize?: string;
  selectedColor?: string;
  suggestedSize?: string;
  price?: number;
  canBuy?: boolean;
}

export interface TryOnInput {
  heightCm: number;
  weightKg: number;
  fitPreference: string;
  skinTone: string;
  occasion: string;
  desiredVibe: string;
  usualSize: string;
  inputMode: TryOnInputMode;
}

export interface TryOnSuggestedItem {
  productId: string;
  role: string;
  name: string;
  category: string;
  imageUrl?: string;
  reason: string;
}

export interface OutfitSuggestions {
  outfitComplete: boolean;
  missingRoles: string[];
  improvementSuggestions: string[];
  suggestedItems: TryOnSuggestedItem[];
}

export interface TryOnResult {
  id: string;
  status: TryOnStatus;
  previewMode?: TryOnInputMode;
  previewType?: TryOnPreviewType;
  outfitComplete?: boolean;
  saved?: boolean;
  previewImageUrl?: string;
  recommendedSize?: string;
  alternativeSize?: string;
  recommendedForm?: string;
  recommendedColor?: string;
  improvementSuggestions: string[];
  suggestedItems?: TryOnSuggestedItem[];
  items: TryOnItem[];
  disclaimer: string;
}

export interface CreateTryOnRequest {
  sessionId: string;
  items: { productId: string; category: string }[];
}
