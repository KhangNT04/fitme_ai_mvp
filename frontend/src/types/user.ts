export type FitPreference = "SLIM" | "REGULAR" | "RELAXED" | "OVERSIZE" | "UNSURE";
export type SkinTone = "FAIR" | "MEDIUM" | "TAN" | "DEEP" | "UNSURE";
export type Gender = "FEMALE" | "MALE" | "OTHER";
export type RiskLevel = "SAFE" | "BALANCED" | "BOLD" | "EXPERIMENTAL";
export type WardrobeMode =
  | "NEW_ITEMS_ONLY"
  | "MIX_WARDROBE_AND_BRAND"
  | "USE_WARDROBE_FIRST"
  | "NO_WARDROBE_DATA";

export interface BodyMeasurements {
  shoulderWidthCm?: number;
  chestCm?: number;
  waistCm?: number;
  abdomenCm?: number;
  hipCm?: number;
  thighCm?: number;
  inseamCm?: number;
  armLengthCm?: number;
}

export interface BodyProfile {
  heightCm: number;
  weightKg: number;
  age?: number;
  gender: Gender;
  fitPreference?: FitPreference;
  skinTone?: SkinTone;
  goals?: string[];
  measurements?: BodyMeasurements;
}

export interface StyleProfile {
  primaryStyle?: string;
  secondaryStyles?: string[];
  riskLevel?: RiskLevel;
  artisticMode?: boolean;
  preferredColors?: string[];
  avoidedColors?: string[];
}

export interface OccasionRequest {
  occasion?: string;
  desiredVibe?: string;
  budgetMin?: number;
  budgetMax?: number;
}

export interface WardrobeItem {
  id: string;
  itemType: string;
  category: string;
  color: string;
  material?: string;
  fit?: string;
  styleTags: string[];
  imageUrl?: string;
  createdAt: string;
}
