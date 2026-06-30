import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  DISCOVER_SEARCH_HASH,
  DISCOVER_SEARCH_FOCUS_EVENT,
  openDiscoverSearch,
} from "./discover-search";

describe("discover-search", () => {
  beforeEach(() => {
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  });

  it("scrolls to top, sets hash, and dispatches focus event", () => {
    window.location.hash = "";
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");
    openDiscoverSearch("auto");
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: "auto" });
    expect(window.location.hash).toBe(DISCOVER_SEARCH_HASH);
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: DISCOVER_SEARCH_FOCUS_EVENT }));
  });
});
