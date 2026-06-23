import { describe, expect, it, vi, beforeEach } from "vitest";
import apiClient from "./api-client";
import { recommendationApi } from "./recommendation-api";

vi.mock("./api-client", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
  unwrap: vi.fn((response: { data: unknown }) => {
    const data = response.data as { success?: boolean; data?: unknown };
    if (data && typeof data === "object" && "success" in data && "data" in data) {
      return data.data;
    }
    return response.data;
  }),
}));

const mockedGet = vi.mocked(apiClient.get);

describe("recommendationApi mapRecommendation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps recommendationId to id", async () => {
    const backendPayload = {
      recommendationId: "rec-abc-123",
      title: "Weekend casual",
      confidence: "HIGH",
      outfitItems: [
        {
          displayName: "White tee",
          productId: "prod-1",
          role: "Top",
          selectedColor: "White",
        },
      ],
    };

    mockedGet.mockResolvedValue({
      data: { success: true, data: backendPayload },
    });

    const result = await recommendationApi.getById("rec-abc-123");

    expect(result.id).toBe("rec-abc-123");
    expect(result.title).toBe("Weekend casual");
    expect(result.outfitItems[0].name).toBe("White tee");
  });
});
