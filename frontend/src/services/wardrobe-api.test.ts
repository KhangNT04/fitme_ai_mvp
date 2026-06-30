import { describe, expect, it, vi, beforeEach } from "vitest";
import apiClient from "./api-client";
import { wardrobeApi } from "./wardrobe-api";

vi.mock("./api-client", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
  unwrap: (res: { data: unknown }) => (res.data as { data?: unknown }).data ?? res.data,
}));

vi.mock("./privacy-api", () => ({
  privacyApi: {
    recordConsent: vi.fn(),
  },
}));

describe("wardrobeApi", () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset();
    vi.mocked(apiClient.post).mockReset();
  });

  it("list maps backend wardrobe items", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        success: true,
        data: [{ id: "w1", name: "Áo thun trắng", category: "Áo", color: "Trắng", styleTags: [], createdAt: "2026-01-01T00:00:00Z" }],
      },
    });
    const items = await wardrobeApi.list();
    expect(items).toHaveLength(1);
    expect(items[0].itemType).toBe("Áo thun trắng");
    expect(apiClient.get).toHaveBeenCalledWith("/wardrobe/items");
  });

  it("recordConsent uses wardrobe consent type", async () => {
    const { privacyApi } = await import("./privacy-api");
    await wardrobeApi.recordConsent();
    expect(privacyApi.recordConsent).toHaveBeenCalledWith("WARDROBE_IMAGE_UPLOAD", true);
  });
});
