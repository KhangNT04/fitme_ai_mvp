import { describe, expect, it } from "vitest";
import {
  discountedPrice,
  effectivePrice,
  formatDiscountWindow,
  fromDateTimeLocalValue,
  isDiscountActive,
  toDateTimeLocalValue,
} from "@/lib/plan-pricing";

const NOW = new Date("2026-10-07T03:00:00Z");

describe("isDiscountActive", () => {
  it("needs a positive percent", () => {
    expect(isDiscountActive({ discountPercent: null }, NOW)).toBe(false);
    expect(isDiscountActive({ discountPercent: 0 }, NOW)).toBe(false);
    expect(isDiscountActive({ discountPercent: 10 }, NOW)).toBe(true);
  });

  it("treats the window as inclusive with open bounds", () => {
    const window = { discountPercent: 20, discountStartsAt: "2026-10-07T02:00:00Z", discountEndsAt: "2026-10-07T03:00:00Z" };
    expect(isDiscountActive(window, NOW)).toBe(true);
    expect(isDiscountActive(window, new Date("2026-10-07T03:00:00.001Z"))).toBe(false);
    expect(isDiscountActive(window, new Date("2026-10-07T01:59:59Z"))).toBe(false);
    expect(isDiscountActive({ discountPercent: 20, discountEndsAt: "2026-10-08T00:00:00Z" }, NOW)).toBe(true);
    expect(isDiscountActive({ discountPercent: 20, discountStartsAt: "2026-10-08T00:00:00Z" }, NOW)).toBe(false);
  });
});

describe("discountedPrice / effectivePrice", () => {
  it("rounds half-up to whole VND like the backend", () => {
    expect(discountedPrice(999_000, 20)).toBe(799_200);
    expect(discountedPrice(999_000, 33)).toBe(669_330);
    expect(discountedPrice(999, 50)).toBe(500);
    expect(discountedPrice(999_000, 0)).toBe(999_000);
    expect(discountedPrice(999_000, 100)).toBe(0);
  });

  it("falls back to the list price outside the window", () => {
    const plan = { priceVnd: 999_000, discountPercent: 20, discountEndsAt: "2026-10-01T00:00:00Z" };
    expect(effectivePrice(plan, NOW)).toBe(999_000);
    expect(effectivePrice({ ...plan, discountEndsAt: null }, NOW)).toBe(799_200);
  });
});

describe("formatDiscountWindow", () => {
  it("describes open and closed windows in Vietnam time", () => {
    expect(formatDiscountWindow("2026-09-30T17:00:00Z", "2026-10-31T16:59:00Z")).toBe(
      "từ 01/10/2026 00:00 đến 31/10/2026 23:59",
    );
    expect(formatDiscountWindow(null, "2026-10-31T16:59:00Z")).toBe("đến 31/10/2026 23:59");
    expect(formatDiscountWindow("2026-09-30T17:00:00Z", null)).toBe("từ 01/10/2026 00:00");
    expect(formatDiscountWindow(null, null)).toBe("");
  });
});

describe("datetime-local conversion", () => {
  it("round-trips through the browser's local time", () => {
    const local = toDateTimeLocalValue("2026-10-07T03:45:00Z");
    expect(local).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    expect(fromDateTimeLocalValue(local)).toBe("2026-10-07T03:45:00.000Z");
  });

  it("maps empty values to empty / null", () => {
    expect(toDateTimeLocalValue(null)).toBe("");
    expect(fromDateTimeLocalValue("")).toBeNull();
    expect(fromDateTimeLocalValue("not-a-date")).toBeNull();
  });
});
