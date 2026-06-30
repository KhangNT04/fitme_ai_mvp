import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  handleSamePageNavClick,
  isSameNavTarget,
  scrollToTop,
} from "./scroll-to-top";

describe("scroll-to-top", () => {
  beforeEach(() => {
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  });

  it("detects same nav target ignoring trailing slash and query", () => {
    expect(isSameNavTarget("/try-on", "/try-on")).toBe(true);
    expect(isSameNavTarget("/try-on/", "/try-on")).toBe(true);
    expect(isSameNavTarget("/try-on/selected", "/try-on")).toBe(false);
  });

  it("scrolls to top", () => {
    scrollToTop();
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: "smooth" });
  });

  it("prevents navigation when already on target route", () => {
    const preventDefault = vi.fn();
    handleSamePageNavClick({ preventDefault }, "/discover", "/discover");
    expect(preventDefault).toHaveBeenCalled();
    expect(window.scrollTo).toHaveBeenCalled();
  });
});
