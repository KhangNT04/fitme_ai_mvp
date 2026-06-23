import { describe, expect, it } from "vitest";
import { formatPrice, formatPercent } from "./format-price";

describe("formatPrice", () => {
  it("formats VND prices with Vietnamese locale", () => {
    const formatted = formatPrice(1500000);
    expect(formatted).toContain("1");
    expect(formatted).toContain("500");
    expect(formatted).toMatch(/₫|VND|đ/i);
  });

  it("formats zero without decimal places", () => {
    const formatted = formatPrice(0);
    expect(formatted).not.toContain(".");
    expect(formatted).toMatch(/₫|VND|đ/i);
  });

  it("formats large amounts", () => {
    const formatted = formatPrice(2500000);
    expect(formatted).toContain("2");
    expect(formatted).toContain("500");
  });
});

describe("formatPercent", () => {
  it("formats decimal as percentage string", () => {
    expect(formatPercent(0.856)).toBe("85.6%");
  });
});
