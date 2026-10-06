import { describe, expect, it } from "vitest";
import { safeInternalPath, safeInternalPathOr } from "./safe-redirect";

describe("safeInternalPath", () => {
  it("keeps same-origin paths with query strings", () => {
    expect(safeInternalPath("/products/abc?size=M")).toBe("/products/abc?size=M");
  });

  it.each([
    "https://evil.com",
    "//evil.com",
    "/\\evil.com",
    "javascript:alert(1)",
    "evil.com",
    "/\tevil",
    "",
  ])("rejects %j", (raw) => {
    expect(safeInternalPath(raw)).toBeNull();
  });

  it("falls back when unsafe", () => {
    expect(safeInternalPathOr("https://evil.com", "/profile")).toBe("/profile");
    expect(safeInternalPathOr(null, "/profile")).toBe("/profile");
  });
});
