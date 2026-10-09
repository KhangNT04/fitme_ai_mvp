import { describe, expect, it } from "vitest";
import { brandLinkError, isValidWebLink, normalizeBrandLinks, normalizeWebLink } from "./brand-links";

describe("normalizeWebLink", () => {
  it.each([
    ["shopee.vn/teelab", "https://shopee.vn/teelab"],
    ["  www.teelab.vn  ", "https://www.teelab.vn"],
    ["//instagram.com/teelab", "https://instagram.com/teelab"],
    ["shop.vn:8080/x", "https://shop.vn:8080/x"],
    ["https://shopee.vn/teelab", "https://shopee.vn/teelab"],
    ["http://teelab.vn", "http://teelab.vn"],
    ["HTTPS://Shopee.vn/Teelab", "https://Shopee.vn/Teelab"],
    ["javascript:alert(1)", "javascript:alert(1)"],
    ["", ""],
    ["   ", ""],
  ])("%s -> %s", (input, expected) => {
    expect(normalizeWebLink(input)).toBe(expected);
  });

  it("treats null / undefined as blank", () => {
    expect(normalizeWebLink(null)).toBe("");
    expect(normalizeWebLink(undefined)).toBe("");
  });
});

describe("isValidWebLink", () => {
  it("accepts http(s) links with a dotted host only", () => {
    expect(isValidWebLink("https://shopee.vn/teelab")).toBe(true);
    expect(isValidWebLink("https://localhost/x")).toBe(false);
    expect(isValidWebLink("javascript:alert(1)")).toBe(false);
    expect(isValidWebLink("ftp://teelab.vn")).toBe(false);
    expect(isValidWebLink("https://teelab.vn/a b")).toBe(false);
  });
});

describe("brandLinkError", () => {
  it("allows blank and scheme-less links", () => {
    expect(brandLinkError("", "Shopee")).toBeNull();
    expect(brandLinkError(undefined, "Shopee")).toBeNull();
    expect(brandLinkError("shopee.vn/teelab", "Shopee")).toBeNull();
  });

  it("rejects non-web links with a Vietnamese message", () => {
    expect(brandLinkError("javascript:alert(1)", "Shopee")).toBe("Link Shopee không hợp lệ, cần dạng https://...");
    expect(brandLinkError("teelab", "website")).toBe("Link website không hợp lệ, cần dạng https://...");
  });
});

describe("normalizeBrandLinks", () => {
  it("normalizes only link fields and keeps blanks so they clear", () => {
    expect(
      normalizeBrandLinks({ name: "Teelab", shopeeUrl: "shopee.vn/teelab", websiteUrl: "", facebookUrl: undefined }),
    ).toEqual({ name: "Teelab", shopeeUrl: "https://shopee.vn/teelab", websiteUrl: "", facebookUrl: undefined });
  });
});
