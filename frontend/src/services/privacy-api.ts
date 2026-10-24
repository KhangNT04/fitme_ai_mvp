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
  | "BRAND_LEAD_SHARING"
  | "COMMUNITY_SHARE";

export const PRIVACY_CONSENTS_QUERY_KEY = ["privacy-consents"] as const;
export const ACCOUNT_DELETION_QUERY_KEY = ["account-deletion-status"] as const;

/** Trạng thái yêu cầu tự xoá tài khoản. */
export interface AccountDeletionStatus {
  requestId: string | null;
  /** "PENDING" khi đang chờ, "CANCELLED" nếu đã huỷ, null khi chưa từng yêu cầu. */
  status: "PENDING" | "CANCELLED" | "PROCESSING" | "COMPLETED" | "FAILED" | null;
  requestedAt: string | null;
  /** Thời điểm tài khoản sẽ bị xoá thật. */
  scheduledFor: string | null;
  daysRemaining: number | null;
  reason: string | null;
}

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

export const accountDeletionApi = {
  /** Đặt lịch xoá tài khoản sau grace period; cần mật khẩu hiện tại + xác nhận bằng cụm "XOA TAI KHOAN". */
  requestDeletion: async (data: {
    currentPassword: string;
    confirmationText: string;
    reason?: string;
    gracePeriodDays?: number;
  }): Promise<AccountDeletionStatus> => {
    const res = await apiClient.post("/me/account-deletion", data);
    return unwrap(res) as AccountDeletionStatus;
  },

  /** Huỷ yêu cầu đang chờ; tài khoản dùng lại bình thường. */
  cancelDeletion: async (reason?: string): Promise<AccountDeletionStatus> => {
    const res = await apiClient.post("/me/account-deletion/cancel", { reason });
    return unwrap(res) as AccountDeletionStatus;
  },

  /** Trạng thái yêu cầu hiện tại. */
  getStatus: async (): Promise<AccountDeletionStatus> => {
    const res = await apiClient.get("/me/account-deletion");
    return unwrap(res) as AccountDeletionStatus;
  },
};
