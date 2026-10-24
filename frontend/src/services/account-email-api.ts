import apiClient, { unwrap } from "./api-client";
import { mapAuthResponse } from "./auth-api";
import type { AuthResponse } from "@/types/auth";

export interface EmailChangeStatus {
  /** The address the owner asked to switch to; null when no change is pending. */
  pendingEmail?: string | null;
  requestedAt?: string | null;
  expiresAt?: string | null;
  /** True while a code is pending confirmation. */
  pending: boolean;
}

/** Self-service change of the sign-in email: password first, then the code sent to the new address. */
export const accountEmailApi = {
  getStatus: async (): Promise<EmailChangeStatus> => {
    const res = await apiClient.get("/me/email");
    return unwrap(res);
  },
  /** Step 1: validates the current password and mails a 6-digit code to the new address. */
  requestChange: async (currentPassword: string, newEmail: string): Promise<EmailChangeStatus> => {
    const res = await apiClient.post("/me/email/request", { currentPassword, newEmail });
    return unwrap(res);
  },
  /** Step 2: applies the new email and returns a fresh session (the old tokens carry the old email). */
  confirmChange: async (code: string): Promise<AuthResponse> => {
    const res = await apiClient.post("/me/email/confirm", { code });
    return mapAuthResponse(unwrap(res));
  },
  /** Abandons a pending change; the account keeps its current email. */
  cancelChange: async (): Promise<EmailChangeStatus> => {
    const res = await apiClient.delete("/me/email/pending");
    return unwrap(res);
  },
};
