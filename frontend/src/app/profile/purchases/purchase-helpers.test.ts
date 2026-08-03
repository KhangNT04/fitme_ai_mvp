import { describe, expect, it } from "vitest";
import { isSameMonth, matchesPurchaseSearch } from "./purchase-helpers";

describe("purchase spend helpers", () => {
  it("matches brand/product search case-insensitively", () => {
    expect(
      matchesPurchaseSearch({ productName: "Áo thun basic", brandName: "Seoul Basic" }, "seoul"),
    ).toBe(true);
    expect(matchesPurchaseSearch({ productName: "Quần jean", brandName: "K-Style" }, "áo")).toBe(
      false,
    );
  });

  it("detects same calendar month for monthly total", () => {
    const now = new Date("2026-08-02T10:00:00+07:00");
    expect(isSameMonth("2026-08-01T12:00:00+07:00", now)).toBe(true);
    expect(isSameMonth("2026-07-31T23:00:00+07:00", now)).toBe(false);
    expect(isSameMonth(null, now)).toBe(false);
  });
});
