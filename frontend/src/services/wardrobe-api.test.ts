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

describe("wardrobeApi", () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset();
  });

  it("list fetches wardrobe items", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { success: true, data: [{ id: "w1", itemType: "Áo", category: "Áo thun" }] },
    });
    const items = await wardrobeApi.list();
    expect(items).toHaveLength(1);
    expect(apiClient.get).toHaveBeenCalledWith("/wardrobe/items");
  });
});
