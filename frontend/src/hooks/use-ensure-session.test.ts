import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const pushMock = vi.fn();
const createAnonymousMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
  usePathname: () => "/try-on/color/test-id",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/services/session-api", () => ({
  sessionApi: {
    createAnonymous: (...args: unknown[]) => createAnonymousMock(...args),
  },
}));

import { useEnsureSession } from "./use-ensure-session";
import { useSessionStore } from "@/stores/session-store";
import { useConsultationStore } from "@/stores/consultation-store";

describe("useEnsureSession", () => {
  beforeEach(() => {
    pushMock.mockReset();
    createAnonymousMock.mockReset();
    useSessionStore.setState({ session: null });
    useConsultationStore.setState({ draft: { sessionId: "", wardrobeMode: "MIX_WARDROBE_AND_BRAND" } });
  });

  it("creates anonymous session when no token exists", async () => {
    createAnonymousMock.mockResolvedValue({
      sessionId: "new-sess",
      sessionToken: "token-new",
      privacyVersion: "1.0",
    });

    const { result } = renderHook(() => useEnsureSession());

    let returned: unknown;
    await act(async () => {
      returned = await result.current.ensureSession();
    });

    expect(createAnonymousMock).toHaveBeenCalledOnce();
    expect(returned).toMatchObject({ sessionId: "new-sess", sessionToken: "token-new" });
    expect(useSessionStore.getState().session?.sessionToken).toBe("token-new");
    expect(useConsultationStore.getState().draft.sessionId).toBe("new-sess");
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("reuses existing session without calling createAnonymous", async () => {
    useSessionStore.getState().setSession({
      sessionId: "existing-sess",
      sessionToken: "existing-token",
      privacyVersion: "1.0",
    });

    const { result } = renderHook(() => useEnsureSession());

    await act(async () => {
      await result.current.ensureSession();
    });

    expect(createAnonymousMock).not.toHaveBeenCalled();
    expect(useConsultationStore.getState().draft.sessionId).toBe("existing-sess");
  });

  it("redirects home when session creation fails", async () => {
    createAnonymousMock.mockRejectedValue(new Error("network"));

    const { result } = renderHook(() => useEnsureSession());

    let returned: unknown;
    await act(async () => {
      returned = await result.current.ensureSession();
    });

    expect(pushMock).toHaveBeenCalledWith("/");
    expect(returned).toBeNull();
  });
});
