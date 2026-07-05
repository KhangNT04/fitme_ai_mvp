import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

const generateMock = vi.fn();
const getByIdMock = vi.fn();

vi.mock("@/services/tryon-api", () => ({
  tryonApi: {
    generate: (...args: unknown[]) => generateMock(...args),
    getById: (...args: unknown[]) => getByIdMock(...args),
  },
}));

import { useTryOnPoll } from "./use-tryon-poll";

describe("useTryOnPoll", () => {
  beforeEach(() => {
    generateMock.mockReset();
    getByIdMock.mockReset();
  });

  it("completes immediately when generate returns COMPLETED", async () => {
    const onCompleted = vi.fn();
    generateMock.mockResolvedValue({
      id: "req-1",
      status: "COMPLETED",
      disclaimer: "AI",
      items: [],
      improvementSuggestions: [],
    });

    const { result } = renderHook(() =>
      useTryOnPoll({ requestId: "req-1", onCompleted, pollIntervalMs: 50 }),
    );

    await waitFor(() => expect(result.current.phase).toBe("completed"));
    expect(onCompleted).toHaveBeenCalledOnce();
    expect(getByIdMock).not.toHaveBeenCalled();
  });

  it("polls until COMPLETED when generate returns PROCESSING", async () => {
    const onCompleted = vi.fn();
    generateMock.mockResolvedValue({
      id: "req-1",
      status: "PROCESSING",
      disclaimer: "",
      items: [],
      improvementSuggestions: [],
    });
    getByIdMock
      .mockResolvedValueOnce({
        id: "req-1",
        status: "PROCESSING",
        disclaimer: "",
        items: [],
        improvementSuggestions: [],
      })
      .mockResolvedValueOnce({
        id: "req-1",
        status: "COMPLETED",
        disclaimer: "AI",
        items: [],
        improvementSuggestions: [],
      });

    const { result } = renderHook(() =>
      useTryOnPoll({ requestId: "req-1", onCompleted, pollIntervalMs: 50 }),
    );

    await waitFor(() => expect(result.current.phase).toBe("completed"), { timeout: 3000 });
    expect(getByIdMock).toHaveBeenCalled();
    expect(onCompleted).toHaveBeenCalledOnce();
  });
});
