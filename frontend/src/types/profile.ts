/** Aggregated profile data for the profile hub. */
export interface ProfileSummary {
  /** 0..1 completion of the checklist shown in the progress card. */
  completionRatio: number;
  bodyProfileComplete: boolean;
  measurementsComplete: boolean;
  /** True when the user filled in a style profile (phong cách, dịp, màu sắc). */
  styleProfileComplete: boolean;
  /** True when the user picked at least one favourite brand (Premium feature). */
  brandPreferencesComplete: boolean;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  galleryImages: number;
  savedOutfits: number;
  savedTryOns: number;
  wardrobeItems: number;
  checkinStreak: number;
  fitkenBalance: number;
  fitkenEarnedThisMonth: number;
  communityPosts: number;
  communityFollowers: number;
  /** The next checklist step worth completing; null when everything is done. */
  nextStep?: string | null;
}
