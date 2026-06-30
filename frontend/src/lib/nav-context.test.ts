import { describe, expect, it, beforeEach } from "vitest";
import {
  getConsumerNavContext,
  isTryOnNavContext,
  productDetailHref,
  resolveProductPageBack,
  TRYON_HUB,
  DISCOVER_HUB,
  setConsumerNavContext,
  NAV_CONTEXT_STORAGE_KEY,
} from "./nav-context";
import { recordNavVisit } from "./nav-history";

describe("nav-context", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("builds try-on product links with from param", () => {
    expect(productDetailHref("abc", "tryon")).toBe("/products/abc?from=try-on");
    expect(productDetailHref("abc", "discover")).toBe("/products/abc");
  });

  it("detects try-on context from route and query", () => {
    expect(isTryOnNavContext("/try-on")).toBe(true);
    expect(isTryOnNavContext("/products/x", new URLSearchParams("from=try-on"))).toBe(true);
    expect(isTryOnNavContext("/products/x", new URLSearchParams())).toBe(false);
  });

  it("persists try-on context in session storage for product pages", () => {
    setConsumerNavContext("tryon");
    expect(getConsumerNavContext()).toBe("tryon");
    expect(isTryOnNavContext("/products/x")).toBe(true);
    sessionStorage.removeItem(NAV_CONTEXT_STORAGE_KEY);
    expect(isTryOnNavContext("/products/x")).toBe(false);
  });

  it("detects try-on context from navigation history", () => {
    recordNavVisit("/try-on");
    recordNavVisit("/products/x");
    expect(isTryOnNavContext("/products/x")).toBe(true);
  });

  it("resolveProductPageBack uses hub label after try-on wizard steps", () => {
    recordNavVisit("/discover");
    recordNavVisit("/try-on");
    recordNavVisit("/try-on/input");
    recordNavVisit("/products/abc");
    expect(resolveProductPageBack([], { fromTryOn: false })).toEqual(DISCOVER_HUB);

    const stack = [
      { href: "/discover", label: "Khám phá sản phẩm" },
      { href: "/try-on", label: "Thử mặc AI" },
      { href: "/try-on/input", label: "Thông tin thử mặc" },
      { href: "/products/abc", label: "Thông tin sản phẩm" },
    ];
    expect(resolveProductPageBack(stack)).toEqual(TRYON_HUB);
  });

  it("resolveProductPageBack respects from=try-on query", () => {
    expect(resolveProductPageBack([], { fromTryOn: true })).toEqual(TRYON_HUB);
  });

  it("resolveProductPageBack returns ai result when from ai-result query", () => {
    expect(
      resolveProductPageBack([], {
        fromAiResult: true,
        recommendationId: "rec-99",
      }),
    ).toEqual({
      href: "/ai/result/rec-99",
      label: "Kết quả tư vấn",
    });
  });
});
