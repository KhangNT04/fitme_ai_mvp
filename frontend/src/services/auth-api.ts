import apiClient, { unwrap } from "./api-client";
import type {
  AuthResponse,
  AuthUser,
  LoginRequest,
  RegisterRequest,
  VerifyEmailRequest,
  ForgotPasswordRequest,
} from "@/types/auth";
import { SESSION_STORAGE_KEY } from "@/utils/constants";

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

export const authApi = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const res = await apiClient.post("/auth/login", data);
    return mapAuthResponse(unwrap(res));
  },
  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const res = await apiClient.post("/auth/register", {
      email: data.email,
      password: data.password,
      displayName: data.fullName,
    });
    const auth = mapAuthResponse(unwrap(res));
    const sessionToken =
      typeof window !== "undefined" ? localStorage.getItem(SESSION_STORAGE_KEY) : null;
    if (sessionToken) {
      try {
        await apiClient.post("/sessions/link-to-user", { sessionToken });
      } catch {
        // Session link optional if token expired
      }
    }
    return auth;
  },
  verifyEmail: async (data: VerifyEmailRequest): Promise<void> => {
    await apiClient.post("/auth/verify-email", { token: data.code });
  },
  forgotPassword: async (data: ForgotPasswordRequest): Promise<void> => {
    await apiClient.post("/auth/forgot-password", data);
  },
  logout: async (): Promise<void> => {
    await apiClient.post("/auth/logout");
  },
  refreshToken: async (refreshToken: string): Promise<AuthResponse> => {
    const res = await apiClient.post("/auth/refresh-token", { refreshToken });
    return mapAuthResponse(unwrap(res));
  },
};
