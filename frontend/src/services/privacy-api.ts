import apiClient, { unwrap } from "./api-client";

export interface DeletionRequestPayload {
  requestType:
    | "BODY_PROFILE"
    | "STYLE_PROFILE"
    | "PHOTO_UPLOAD"
    | "WARDROBE"
    | "RECOMMENDATION_HISTORY"
    | "ALL";
  reason?: string;
}

export type ConsentType =
  | "PRIVACY_NOTICE"
  | "PHOTO_UPLOAD"
  | "WARDROBE_IMAGE_UPLOAD"
  | "AI_PREVIEW"
  | "BRAND_LEAD_SHARING";

export const PRIVACY_CONSENTS_QUERY_KEY = ["privacy-consents"] as const;

export const privacyApi = {
  getConsents: async (): Promise<Partial<Record<ConsentType, boolean>>> => {
    const res = await apiClient.get("/privacy/consent");
    return (unwrap(res) as Partial<Record<ConsentType, boolean>>) ?? {};
  },
  requestDeletion: async (data: DeletionRequestPayload): Promise<unknown> => {
    const res = await apiClient.post("/privacy/deletion-requests", data);
    return unwrap(res);
  },
  recordConsent: async (consentType: string, accepted: boolean): Promise<unknown> => {
    const res = await apiClient.post("/privacy/consent", { consentType, accepted });
    return unwrap(res);
  },
};
