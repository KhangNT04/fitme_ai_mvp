import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { formatUserErrorMessage } from "@/lib/user-error-message";
import { API_URL, SESSION_STORAGE_KEY, AUTH_TOKEN_KEY, AUTH_REFRESH_KEY } from "@/utils/constants";

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  message?: string;
}

interface BackendAuthResponse {
  userId: string;
  email: string;
  displayName: string;
  role: string;
  accessToken: string;
  refreshToken: string;
  emailVerified: boolean;
}

const apiClient = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const refreshToken = localStorage.getItem(AUTH_REFRESH_KEY);
  if (!refreshToken) return null;

  try {
    const res = await axios.post<ApiResponse<BackendAuthResponse>>(
      `${API_URL}/auth/refresh-token`,
      { refreshToken },
      { headers: { "Content-Type": "application/json" }, timeout: 30000 }
    );
    const data = res.data?.data ?? res.data;
    if (data && "accessToken" in data) {
      localStorage.setItem(AUTH_TOKEN_KEY, data.accessToken);
      localStorage.setItem(AUTH_REFRESH_KEY, data.refreshToken);
      return data.accessToken;
    }
  } catch {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_REFRESH_KEY);
  }
  return null;
}

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== "undefined") {
    const sessionToken = localStorage.getItem(SESSION_STORAGE_KEY);
    const accessToken = localStorage.getItem(AUTH_TOKEN_KEY);

    if (sessionToken) {
      config.headers["X-Anonymous-Session"] = sessionToken;
    }
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiResponse<unknown>>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/refresh-token") &&
      !originalRequest.url?.includes("/auth/login")
    ) {
      originalRequest._retry = true;
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }
      const newToken = await refreshPromise;
      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      }
    }

    const status = error.response?.status;
    const rawMessage =
      (error.response?.data as ApiResponse<unknown>)?.error ||
      error.response?.data?.message ||
      error.message;
    const message = formatUserErrorMessage(rawMessage, status);
    return Promise.reject({ message, status } as ApiError);
  }
);

export function unwrap<T>(response: { data: ApiResponse<T> | T }): T {
  const data = response.data;
  if (data && typeof data === "object" && "success" in data && "data" in data) {
    return (data as ApiResponse<T>).data;
  }
  return data as T;
}

export default apiClient;
