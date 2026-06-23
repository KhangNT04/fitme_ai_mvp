import { describe, expect, it, beforeEach } from "vitest";
import { useSessionStore } from "./session-store";
import { SESSION_STORAGE_KEY } from "@/utils/constants";

describe("useSessionStore", () => {
  beforeEach(() => {
    localStorage.clear();
    useSessionStore.setState({ session: null });
  });

  it("setSession stores token in state and localStorage", () => {
    const session = {
      sessionId: "sess-1",
      sessionToken: "token-abc-xyz",
      privacyVersion: "1.0",
    };

    useSessionStore.getState().setSession(session);

    expect(useSessionStore.getState().session).toEqual(session);
    expect(useSessionStore.getState().getSessionToken()).toBe("token-abc-xyz");
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBe("token-abc-xyz");
  });
});
