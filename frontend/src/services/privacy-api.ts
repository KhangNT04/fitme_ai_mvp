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

export const privacyApi = {
  requestDeletion: async (data: DeletionRequestPayload): Promise<unknown> => {
    const res = await apiClient.post("/privacy/deletion-requests", data);
    return unwrap(res);
  },
  recordConsent: async (consentType: string, accepted: boolean): Promise<unknown> => {
    const res = await apiClient.post("/privacy/consent", { consentType, accepted });
    return unwrap(res);
  },
};
