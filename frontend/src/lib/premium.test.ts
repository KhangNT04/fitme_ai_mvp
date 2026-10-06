import { describe, expect, it } from "vitest";
import { PREMIUM_PERKS, premiumFitkenPerk, premiumPriceLabel, premiumUpgradeCta } from "./premium";

describe("premium copy", () => {
  it("formats the plan price from the API", () => {
    expect(premiumPriceLabel(49000)).toBe("49.000đ/tháng");
    expect(premiumPriceLabel(0)).toBeNull();
    expect(premiumPriceLabel(null)).toBeNull();
  });

  it("builds the upgrade CTA without hard-coded prices", () => {
    expect(premiumUpgradeCta(59000)).toBe("Nâng cấp Premium 59.000đ/tháng");
    expect(premiumUpgradeCta()).toBe("Nâng cấp Premium");
  });

  it("describes the monthly Fitken perk", () => {
    expect(premiumFitkenPerk(15)).toBe("15 Fitken mỗi tháng để thử đồ AI");
    expect(premiumFitkenPerk(undefined)).toBe("Fitken hàng tháng để thử đồ AI");
  });

  it("never calls the consumer plan Plus or Pro", () => {
    for (const perk of PREMIUM_PERKS) {
      expect(perk).not.toMatch(/\b(Plus|Pro)\b/);
    }
    expect(premiumUpgradeCta(49000)).not.toMatch(/\b(Plus|Pro)\b/);
  });
});
