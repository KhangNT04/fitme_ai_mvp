import { describe, expect, it, beforeEach } from "vitest";
import {
  getPreviousNavEntry,
  isEphemeralNavRoute,
  labelForHref,
  popNavHistory,
  recordNavVisit,
  resolveNavBack,
  NAV_HISTORY_STORAGE_KEY,
} from "./nav-history";

describe("nav-history", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("labels known routes in Vietnamese", () => {
    expect(labelForHref("/discover")).toBe("Khám phá sản phẩm");
    expect(labelForHref("/try-on")).toBe("Thử mặc AI");
    expect(labelForHref("/try-on/input")).toBe("Thông tin thử mặc");
    expect(labelForHref("/products/abc")).toBe("Thông tin sản phẩm");
  });

  it("tracks visit stack and resolves previous entry", () => {
    recordNavVisit("/discover");
    recordNavVisit("/products/abc");
    expect(getPreviousNavEntry()).toEqual({
      href: "/discover",
      label: "Khám phá sản phẩm",
    });
    expect(resolveNavBack({ href: "/", label: "Trang chủ" })).toEqual({
      href: "/discover",
      label: "Khám phá sản phẩm",
    });
  });

  it("resolveNavBack uses provided stack for SSR-safe hydration", () => {
    recordNavVisit("/try-on");
    recordNavVisit("/discover");
    expect(resolveNavBack({ href: "/", label: "Trang chủ" }, [])).toEqual({
      href: "/",
      label: "Trang chủ",
    });
  });

  it("trims forward history when returning to an earlier route", () => {
    recordNavVisit("/discover");
    recordNavVisit("/try-on");
    recordNavVisit("/products/1");
    recordNavVisit("/try-on");
    expect(getPreviousNavEntry()?.href).toBe("/discover");
  });

  it("pops current entry before programmatic back navigation", () => {
    recordNavVisit("/try-on");
    recordNavVisit("/products/1");
    popNavHistory();
    expect(sessionStorage.getItem(NAV_HISTORY_STORAGE_KEY)).toBe(
      JSON.stringify([{ href: "/try-on", label: "Thử mặc AI" }]),
    );
  });

  it("does not record ephemeral processing routes", () => {
    recordNavVisit("/try-on/input");
    recordNavVisit("/try-on/processing");
    recordNavVisit("/try-on/result/abc");
    expect(getPreviousNavEntry()).toEqual({
      href: "/try-on/input",
      label: "Thông tin thử mặc",
    });
  });

  it("resolveNavBack skips ephemeral routes still present in legacy stacks", () => {
    const stack = [
      { href: "/ai/occasion", label: "Hoàn cảnh & vibe" },
      { href: "/ai/processing", label: "Đang xử lý tư vấn" },
      { href: "/ai/result/xyz", label: "Kết quả tư vấn" },
    ];
    expect(resolveNavBack({ href: "/discover", label: "Khám phá sản phẩm" }, stack)).toEqual({
      href: "/ai/occasion",
      label: "Hoàn cảnh & vibe",
    });
    expect(isEphemeralNavRoute("/try-on/processing")).toBe(true);
    expect(isEphemeralNavRoute("/ai/processing")).toBe(true);
  });
});
