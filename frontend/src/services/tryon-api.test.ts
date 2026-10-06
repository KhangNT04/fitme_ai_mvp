import { describe, expect, it, vi, beforeEach } from "vitest";
import apiClient from "./api-client";
import { tryonApi } from "./tryon-api";

vi.mock("./api-client", () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
  unwrap: (res: { data: unknown }) => (res.data as { data?: unknown }).data ?? res.data,
}));

describe("tryonApi", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
  });

  it("create posts try-on request", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { success: true, data: { id: "req-1" } },
    });
    const res = await tryonApi.create({
      heightCm: 170,
      weightKg: 60,
      fitPreference: "REGULAR",
      skinTone: "MEDIUM",
      previewMode: "OUTFIT_BOARD_ONLY",
    });
    expect(res.id).toBe("req-1");
  });

  it("getById keeps the backend processing step label while polling", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        success: true,
        data: { id: "req-1", status: "PROCESSING", processingStepLabel: "Đang mặc áo... (1/2)" },
      },
    });
    const res = await tryonApi.getById("req-1");
    expect(res.processingStepLabel).toBe("Đang mặc áo... (1/2)");
  });

  it("generate drops a blank processing step label", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { success: true, data: { id: "req-1", status: "PROCESSING", processingStepLabel: "  " } },
    });
    const res = await tryonApi.generate("req-1");
    expect(res.processingStepLabel).toBeUndefined();
  });
});
