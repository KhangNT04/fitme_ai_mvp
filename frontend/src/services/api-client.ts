import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { API_URL, SESSION_STORAGE_KEY, AUTH_TOKEN_KEY } from "@/utils/constants";

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

const apiClient = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

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
  (error: AxiosError<ApiResponse<unknown>>) => {
    const message =
      (error.response?.data as ApiResponse<unknown>)?.error ||
      error.response?.data?.message ||
      error.message ||
      "Đã xảy ra lỗi. Vui lòng thử lại.";
    return Promise.reject({ message, status: error.response?.status } as ApiError);
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
