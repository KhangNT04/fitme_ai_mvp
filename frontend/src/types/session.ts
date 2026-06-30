export interface AnonymousSession {
  sessionId: string;
  sessionToken: string;
  privacyVersion: string;
}

export interface ConsultationDraft {
  sessionId: string;
  selectedProductId?: string;
  bodyProfile?: import("./user").BodyProfile;
  styleProfile?: import("./user").StyleProfile;
  occasionRequest?: import("./user").OccasionRequest;
  wardrobeMode: import("./user").WardrobeMode;
  photoUploadId?: string;
  recommendationId?: string;
  /** Recommendation whose outfit seeded previewOutfitItems. */
  previewOutfitSourceId?: string;
  previewOutfitItems?: import("./outfit").OutfitItem[];
}
