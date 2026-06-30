import { describe, expect, it, beforeEach } from "vitest";
import { useConsultationStore } from "./consultation-store";

describe("useConsultationStore", () => {
  beforeEach(() => {
    localStorage.clear();
    useConsultationStore.setState({ draft: { sessionId: "", wardrobeMode: "MIX_WARDROBE_AND_BRAND" } });
  });

  it("defaults wardrobeMode to MIX_WARDROBE_AND_BRAND", () => {
    expect(useConsultationStore.getState().draft.wardrobeMode).toBe("MIX_WARDROBE_AND_BRAND");
  });

  it("updates draft fields and reset restores initial state", () => {
    const { setSessionId, setBodyProfile, setStyleProfile, setWardrobeMode, reset } =
      useConsultationStore.getState();

    setSessionId("sess-99");
    setBodyProfile({ heightCm: 170, weightKg: 60, gender: "FEMALE", fitPreference: "REGULAR", skinTone: "MEDIUM", goals: [] });
    setStyleProfile({
      primaryStyle: "Minimal",
      secondaryStyles: [],
      preferredColors: ["Đen"],
      avoidedColors: [],
      riskLevel: "BALANCED",
      artisticMode: false,
    });
    setWardrobeMode("USE_WARDROBE_FIRST");

    const draft = useConsultationStore.getState().draft;
    expect(draft.sessionId).toBe("sess-99");
    expect(draft.bodyProfile?.heightCm).toBe(170);
    expect(draft.styleProfile?.primaryStyle).toBe("Minimal");
    expect(draft.wardrobeMode).toBe("USE_WARDROBE_FIRST");

    reset();
    expect(useConsultationStore.getState().draft.sessionId).toBe("");
    expect(useConsultationStore.getState().draft.wardrobeMode).toBe("MIX_WARDROBE_AND_BRAND");
  });

  it("persists draft to localStorage under fitme-consultation key", () => {
    useConsultationStore.getState().setSessionId("persisted-session");
    useConsultationStore.getState().setWardrobeMode("NEW_ITEMS_ONLY");

    const stored = localStorage.getItem("fitme-consultation");
    expect(stored).toBeTruthy();
    expect(stored).toContain("persisted-session");
    expect(stored).toContain("NEW_ITEMS_ONLY");
  });
});
