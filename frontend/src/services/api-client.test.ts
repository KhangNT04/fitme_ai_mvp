import axios, { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import apiClient, { unwrap, type ApiResponse } from "./api-client";
import { AUTH_CLEAR_EVENT } from "@/lib/auth-events";
import { AUTH_REFRESH_KEY, AUTH_TOKEN_KEY } from "@/utils/constants";

function mockJwt(expiresInSeconds = 3600): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + expiresInSeconds }));
  return `${header}.${payload}.signature`;
}

function httpError(status: number, config: InternalAxiosRequestConfig = { headers: new axios.AxiosHeaders() }) {
  return new AxiosError("Request failed", "ERR_BAD_RESPONSE", config, null, {
    status,
    statusText: "",
    headers: {},
    config,
    data: { success: false, error: "boom" },
  });
}

describe("unwrap", () => {
  it("extracts data from ApiResponse wrapper", () => {
    const payload = { id: "rec-1", title: "Casual look" };
    const response = {
      data: {
        success: true,
        data: payload,
      } satisfies ApiResponse<typeof payload>,
    };

    expect(unwrap(response)).toEqual(payload);
  });

  it("returns raw data when not wrapped in ApiResponse", () => {
    const payload = { id: "rec-2", title: "Office look" };
    const response = { data: payload };

    expect(unwrap(response)).toEqual(payload);
  });
});

describe("apiClient token refresh", () => {
  const originalAdapter = apiClient.defaults.adapter;
  const unauthorizedAdapter: AxiosAdapter = async (config) => {
    throw httpError(401, config);
  };
  let accessToken: string;
  let refreshToken: string;
  let clearListener: Mock<() => void>;

  beforeEach(() => {
    localStorage.clear();
    accessToken = mockJwt();
    refreshToken = mockJwt(7200);
    localStorage.setItem(AUTH_TOKEN_KEY, accessToken);
    localStorage.setItem(AUTH_REFRESH_KEY, refreshToken);
    apiClient.defaults.adapter = unauthorizedAdapter;
    clearListener = vi.fn<() => void>();
    window.addEventListener(AUTH_CLEAR_EVENT, clearListener);
  });

  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter;
    window.removeEventListener(AUTH_CLEAR_EVENT, clearListener);
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it.each([400, 401])("clears tokens when refresh endpoint rejects with %i", async (status) => {
    vi.spyOn(axios, "post").mockRejectedValue(httpError(status));

    await expect(apiClient.get("/me")).rejects.toMatchObject({ status: 401 });

    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(AUTH_REFRESH_KEY)).toBeNull();
    expect(clearListener).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["5xx", () => httpError(503)],
    ["network error", () => new AxiosError("Network Error", AxiosError.ERR_NETWORK)],
    ["timeout", () => new AxiosError("timeout of 30000ms exceeded", AxiosError.ECONNABORTED)],
  ])("keeps tokens when refresh fails with %s", async (_label, makeError) => {
    vi.spyOn(axios, "post").mockRejectedValue(makeError());

    await expect(apiClient.get("/me")).rejects.toMatchObject({ status: 401 });

    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBe(accessToken);
    expect(localStorage.getItem(AUTH_REFRESH_KEY)).toBe(refreshToken);
    expect(clearListener).not.toHaveBeenCalled();
  });

  it("retries the original request with the refreshed access token", async () => {
    const newAccess = mockJwt(3600);
    const newRefresh = mockJwt(9000);
    vi.spyOn(axios, "post").mockResolvedValue({
      data: { success: true, data: { accessToken: newAccess, refreshToken: newRefresh } },
    });
    let calls = 0;
    apiClient.defaults.adapter = async (config) => {
      calls += 1;
      if (calls === 1) throw httpError(401, config);
      return { data: { ok: true, auth: config.headers.Authorization }, status: 200, statusText: "", headers: {}, config };
    };

    const res = await apiClient.get("/me");

    expect(res.data).toEqual({ ok: true, auth: `Bearer ${newAccess}` });
    expect(localStorage.getItem(AUTH_REFRESH_KEY)).toBe(newRefresh);
    expect(clearListener).not.toHaveBeenCalled();
  });
});
