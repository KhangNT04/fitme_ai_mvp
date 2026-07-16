import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";

const replaceMock = vi.fn();

vi.mock("@/components/common/PageSuspense", () => ({
  PageSuspense: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn() }),
  usePathname: () => "/ai/processing",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/stores/consultation-store", () => ({
  useConsultationStore: () => ({
    draft: {
      sessionId: "sess-1",
      recommendationId: null,
      previewOutfitItems: [],
    },
  }),
}));

import AiProcessingPage from "./page";

describe("AiProcessingPage", () => {
  beforeEach(() => {
    replaceMock.mockReset();
  });

  it("redirects non-preview consultation flow to chat", async () => {
    render(<AiProcessingPage />);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/ai/chat");
    });
  });
});
