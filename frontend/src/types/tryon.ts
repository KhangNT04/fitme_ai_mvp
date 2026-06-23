export type TryOnStatus = "DRAFT" | "PROCESSING" | "COMPLETED" | "FAILED";
export type TryOnInputMode = "USER_PHOTO" | "AVATAR" | "OUTFIT_BOARD_ONLY";

export interface TryOnItem {
  productId: string;
  category: string;
  name: string;
  imageUrl?: string;
  color?: string;
  size?: string;
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

export interface TryOnResult {
  id: string;
  status: TryOnStatus;
  previewImageUrl?: string;
  recommendedSize?: string;
  alternativeSize?: string;
  recommendedForm?: string;
  recommendedColor?: string;
  improvementSuggestions: string[];
  items: TryOnItem[];
  disclaimer: string;
}

export interface CreateTryOnRequest {
  sessionId: string;
  items: { productId: string; category: string }[];
}
