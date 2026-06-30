import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const replaceMock = vi.fn();
const saveBodyProfileMock = vi.fn();
const saveStyleProfileMock = vi.fn();
const createRecommendationMock = vi.fn();
const getBodyProfileMock = vi.fn();
const getStyleProfileMock = vi.fn();

vi.mock("@/components/common/PageSuspense", () => ({
  PageSuspense: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    invalidateQueries: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn() }),
  usePathname: () => "/ai/processing",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/services/profile-api", () => ({
  profileApi: {
    saveBodyProfile: (...args: unknown[]) => saveBodyProfileMock(...args),
    saveStyleProfile: (...args: unknown[]) => saveStyleProfileMock(...args),
    getBodyProfile: (...args: unknown[]) => getBodyProfileMock(...args),
    getStyleProfile: (...args: unknown[]) => getStyleProfileMock(...args),
  },
}));

vi.mock("@/services/recommendation-api", () => ({
  recommendationApi: {
    create: (...args: unknown[]) => createRecommendationMock(...args),
  },
}));

const mockDraft = {
  sessionId: "sess-1",
  wardrobeMode: "NO_WARDROBE_DATA" as const,
  bodyProfile: {
    heightCm: 165,
    weightKg: 55,
    fitPreference: "REGULAR" as const,
    skinTone: "MEDIUM" as const,
    goals: [] as string[],
  },
  styleProfile: {
    primaryStyle: "Minimal",
    secondaryStyles: [] as string[],
    preferredColors: ["Đen"],
    avoidedColors: [] as string[],
    riskLevel: "BALANCED" as const,
    artisticMode: false,
  },
  occasionRequest: {
    occasion: "Dạo phố",
    desiredVibe: "Casual",
  },
};

vi.mock("@/stores/consultation-store", () => ({
  useConsultationStore: () => ({
    draft: mockDraft,
    setRecommendationId: vi.fn(),
  }),
}));

import AiProcessingPage from "./page";

describe("AiProcessingPage", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    saveBodyProfileMock.mockReset();
    saveStyleProfileMock.mockReset();
    createRecommendationMock.mockReset();
    getBodyProfileMock.mockReset();
    getStyleProfileMock.mockReset();
    saveBodyProfileMock.mockResolvedValue(undefined);
    saveStyleProfileMock.mockResolvedValue(undefined);
    createRecommendationMock.mockResolvedValue({ id: "rec-123" });
    getBodyProfileMock.mockResolvedValue(null);
    getStyleProfileMock.mockResolvedValue(null);
  });

  it("saves profiles before creating recommendation", async () => {
    render(<AiProcessingPage />);

    await waitFor(() => {
      expect(saveBodyProfileMock).toHaveBeenCalledWith(mockDraft.bodyProfile);
    });
    expect(saveStyleProfileMock).toHaveBeenCalledWith(mockDraft.styleProfile);
    expect(createRecommendationMock).toHaveBeenCalledOnce();

    const bodyOrder = saveBodyProfileMock.mock.invocationCallOrder[0];
    const styleOrder = saveStyleProfileMock.mock.invocationCallOrder[0];
    const createOrder = createRecommendationMock.mock.invocationCallOrder[0];
    expect(bodyOrder).toBeLessThan(createOrder);
    expect(styleOrder).toBeLessThan(createOrder);
  });

  it("redirects to result page on success", async () => {
    render(<AiProcessingPage />);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/ai/result/rec-123");
    });
  });

  it("shows error state when recommendation fails", async () => {
    createRecommendationMock.mockRejectedValue({ message: "API lỗi" });

    render(<AiProcessingPage />);

    expect(await screen.findByText("Tạo gợi ý thất bại")).toBeInTheDocument();
    expect(await screen.findByText("API lỗi")).toBeInTheDocument();
  });
});
