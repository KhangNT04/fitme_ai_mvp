import apiClient, { unwrap } from "./api-client";
import type {
  AuthResponse,
  AuthUser,
  LoginRequest,
  RegisterRequest,
  VerifyEmailRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
} from "@/types/auth";
import { AUTH_TOKEN_KEY, AUTH_REFRESH_KEY, SESSION_STORAGE_KEY } from "@/utils/constants";

interface BackendAuthResponse {
  userId: string;
  email: string;
  displayName: string;
  role: string;
  accessToken: string;
  refreshToken: string;
  emailVerified: boolean;
}

function mapRole(role: string): AuthUser["role"] {
  if (role === "BRAND_OWNER") return "BRAND";
  if (role === "ADMIN") return "ADMIN";
  return "USER";
}

function mapAuthResponse(data: BackendAuthResponse): AuthResponse {
  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    user: {
      id: data.userId,
      email: data.email,
      fullName: data.displayName,
      role: mapRole(data.role),
      emailVerified: data.emailVerified,
    },
  };
}

function storeTokens(accessToken: string, refreshToken: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem(AUTH_TOKEN_KEY, accessToken);
    localStorage.setItem(AUTH_REFRESH_KEY, refreshToken);
  }
}

async function linkAnonymousSession() {
  const sessionToken =
    typeof window !== "undefined" ? localStorage.getItem(SESSION_STORAGE_KEY) : null;
  if (!sessionToken) return;
  try {
    await apiClient.post("/sessions/link-to-user", { sessionToken });
  } catch {
    // Session link optional if token expired
  }
}

export const authApi = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const res = await apiClient.post("/auth/login", data);
    const auth = mapAuthResponse(unwrap(res));
    storeTokens(auth.accessToken, auth.refreshToken);
    await linkAnonymousSession();
    return auth;
  },
  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const res = await apiClient.post("/auth/register", {
      email: data.email,
      password: data.password,
      displayName: data.fullName,
    });
    const auth = mapAuthResponse(unwrap(res));
    storeTokens(auth.accessToken, auth.refreshToken);
    await linkAnonymousSession();
    return auth;
  },
  verifyEmail: async (data: VerifyEmailRequest): Promise<void> => {
    await apiClient.post("/auth/verify-email", { token: data.code });
  },
  forgotPassword: async (data: ForgotPasswordRequest): Promise<void> => {
    await apiClient.post("/auth/forgot-password", data);
  },
  resetPassword: async (data: ResetPasswordRequest): Promise<void> => {
    await apiClient.post("/auth/reset-password", data);
  },
  logout: async (): Promise<void> => {
    const refreshToken =
      typeof window !== "undefined" ? localStorage.getItem(AUTH_REFRESH_KEY) : null;
    if (refreshToken) {
      try {
        await apiClient.post("/auth/logout", { refreshToken });
      } catch {
        // Ignore logout errors
      }
    }
  },
  refreshToken: async (refreshToken: string): Promise<AuthResponse> => {
    const res = await apiClient.post("/auth/refresh-token", { refreshToken });
    return mapAuthResponse(unwrap(res));
  },
};
