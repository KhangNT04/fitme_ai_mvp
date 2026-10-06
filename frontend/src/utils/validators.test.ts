import { describe, expect, it } from "vitest";
import {
  billingPlanFormSchema,
  bodyProfileSchema,
  occasionSchema,
  purchaseUrlSchema,
  styleProfileSchema,
  tryOnInputSchema,
  type BillingPlanFormValues,
} from "./validators";

describe("billingPlanFormSchema", () => {
  const brandPlus: BillingPlanFormValues = {
    code: "BRAND_PLUS",
    name: "FitMe Brand Plus",
    audience: "BRAND",
    planType: "SUBSCRIPTION",
    priceVnd: 999000,
    fitkenAmount: 0,
    billingPeriodDays: 30,
    active: true,
    sortOrder: 100,
    discountPercent: 20,
    discountStartsLocal: "2026-10-01T00:00",
    discountEndsLocal: "2026-10-31T23:59",
  };
  const firstError = (values: BillingPlanFormValues) => {
    const result = billingPlanFormSchema.safeParse(values);
    return result.success ? null : result.error.issues[0];
  };

  it("accepts a brand plan with a discount window and open bounds", () => {
    expect(firstError(brandPlus)).toBeNull();
    expect(firstError({ ...brandPlus, discountStartsLocal: "", discountEndsLocal: "" })).toBeNull();
    expect(firstError({ ...brandPlus, discountPercent: null })).toBeNull();
  });

  it("rejects percent outside 0..100 and windows that end before they start", () => {
    expect(firstError({ ...brandPlus, discountPercent: 120 })?.message).toBe("Phần trăm giảm phải từ 0 đến 100");
    expect(firstError({ ...brandPlus, discountPercent: -1 })?.message).toBe("Phần trăm giảm phải từ 0 đến 100");
    const reversed = firstError({ ...brandPlus, discountStartsLocal: "2026-10-31T00:00", discountEndsLocal: "2026-10-01T00:00" });
    expect(reversed?.message).toBe("Thời điểm kết thúc phải sau thời điểm bắt đầu");
    expect(reversed?.path).toEqual(["discountEndsLocal"]);
  });

  it("requires Fitken for consumer plans and a period for subscriptions", () => {
    expect(firstError({ ...brandPlus, audience: "CONSUMER", discountPercent: null })?.message).toBe(
      "Gói người dùng cần ít nhất 1 Fitken",
    );
    expect(firstError({ ...brandPlus, billingPeriodDays: null })?.message).toBe("Chu kỳ tối thiểu 1 ngày");
    expect(firstError({ ...brandPlus, planType: "TOPUP", billingPeriodDays: null })?.message).toBe(
      "Gói brand phải là gói theo chu kỳ",
    );
  });
});

describe("purchaseUrlSchema", () => {
  const message = (value: unknown) => purchaseUrlSchema.safeParse(value).error?.issues[0]?.message;

  it("requires a link to the store's product page", () => {
    expect(message("")).toBe("Link mua hàng không được để trống");
    expect(message("   ")).toBe("Link mua hàng không được để trống");
    expect(message(undefined)).toBe("Link mua hàng không được để trống");
  });

  it("rejects links that are not http(s) with a real host", () => {
    for (const bad of ["not-a-valid-url", "javascript:alert(1)", "ftp://shop.vn/a", "https://localhost/a"]) {
      expect(message(bad)).toContain("Link mua hàng không hợp lệ");
    }
  });

  it("accepts and trims a valid store link", () => {
    expect(purchaseUrlSchema.parse("  https://brand.vn/products/ao  ")).toBe("https://brand.vn/products/ao");
  });
});

const validBodyProfile = {
  heightCm: 170,
  weightKg: 65,
  age: 25,
  gender: "FEMALE" as const,
  fitPreference: "REGULAR" as const,
};

describe("bodyProfileSchema", () => {
  it("accepts only basic measurements", () => {
    expect(bodyProfileSchema.safeParse({
      heightCm: 170,
      weightKg: 65,
      age: 25,
      gender: "FEMALE",
      fitPreference: "OVERSIZE",
    }).success).toBe(true);
  });

  it("accepts weight within 25-250 kg", () => {
    expect(bodyProfileSchema.safeParse({ ...validBodyProfile, weightKg: 25 }).success).toBe(true);
    expect(bodyProfileSchema.safeParse({ ...validBodyProfile, weightKg: 250 }).success).toBe(true);
    expect(bodyProfileSchema.safeParse({ ...validBodyProfile, weightKg: 100 }).success).toBe(true);
  });

  it("accepts optional fields when provided", () => {
    expect(
      bodyProfileSchema.safeParse({
        ...validBodyProfile,
        fitPreference: "REGULAR" as const,
        skinTone: "MEDIUM" as const,
        goals: ["Thoải mái hơn"],
      }).success,
    ).toBe(true);
  });

  it("accepts partial detailed measurements with omitted optional fields", () => {
    expect(
      bodyProfileSchema.safeParse({
        ...validBodyProfile,
        chestCm: 90,
        hipCm: undefined,
      }).success,
    ).toBe(true);
  });

  it("rejects invalid detailed measurement when provided", () => {
    const result = bodyProfileSchema.safeParse({
      ...validBodyProfile,
      chestCm: 10,
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing gender", () => {
    expect(bodyProfileSchema.safeParse({
      heightCm: 170,
      weightKg: 65,
      age: 25,
      fitPreference: "REGULAR",
    }).success).toBe(false);
  });

  it("rejects missing fit preference", () => {
    expect(bodyProfileSchema.safeParse({ heightCm: 170, weightKg: 65, age: 25, gender: "FEMALE" }).success).toBe(false);
  });

  it("rejects weight below 25 kg", () => {
    const result = bodyProfileSchema.safeParse({ ...validBodyProfile, weightKg: 24 });
    expect(result.success).toBe(false);
  });

  it("rejects weight above 250 kg", () => {
    const result = bodyProfileSchema.safeParse({ ...validBodyProfile, weightKg: 251 });
    expect(result.success).toBe(false);
  });
});

describe("occasionSchema wardrobeMode", () => {
  const baseOccasion = {
    occasion: "Đi cafe",
    desiredVibe: "Gọn gàng",
  };

  it("accepts submission without occasion or vibe", () => {
    const result = occasionSchema.safeParse({ wardrobeMode: "MIX_WARDROBE_AND_BRAND" });
    expect(result.success).toBe(true);
  });

  const backendWardrobeModes = [
    "NEW_ITEMS_ONLY",
    "MIX_WARDROBE_AND_BRAND",
    "USE_WARDROBE_FIRST",
    "NO_WARDROBE_DATA",
  ] as const;

  it.each(backendWardrobeModes)("accepts wardrobeMode %s", (wardrobeMode) => {
    const result = occasionSchema.safeParse({ ...baseOccasion, wardrobeMode });
    expect(result.success).toBe(true);
  });

  it("rejects invalid wardrobeMode values", () => {
    const result = occasionSchema.safeParse({
      ...baseOccasion,
      wardrobeMode: "INVALID_MODE",
    });
    expect(result.success).toBe(false);
  });
});

describe("styleProfileSchema", () => {
  it("accepts completely empty optional profile", () => {
    expect(styleProfileSchema.safeParse({}).success).toBe(true);
  });

  it("accepts null or sentinel riskLevel from API/select", () => {
    expect(styleProfileSchema.safeParse({ riskLevel: null }).success).toBe(true);
    expect(styleProfileSchema.safeParse({ riskLevel: "__none__" }).success).toBe(true);
  });

  it("accepts partial selections", () => {
    expect(
      styleProfileSchema.safeParse({
        primaryStyle: "Minimal",
        preferredColors: ["Đen"],
        artisticMode: false,
      }).success,
    ).toBe(true);
  });
});

describe("tryOnInputSchema", () => {
  it("rejects missing required measurements", () => {
    const result = tryOnInputSchema.safeParse({
      inputMode: "OUTFIT_BOARD_ONLY",
      fitPreference: "REGULAR",
    });
    expect(result.success).toBe(false);
  });

  it("accepts submission without optional context fields", () => {
    const result = tryOnInputSchema.safeParse({
      heightCm: 170,
      weightKg: 60,
      fitPreference: "REGULAR",
      inputMode: "OUTFIT_BOARD_ONLY",
    });
    expect(result.success).toBe(true);
  });

  it("accepts null or sentinel optional enum values", () => {
    const result = tryOnInputSchema.safeParse({
      heightCm: 170,
      weightKg: 60,
      fitPreference: "REGULAR",
      skinTone: null,
      occasion: undefined,
      desiredVibe: "__none__",
      inputMode: "OUTFIT_BOARD_ONLY",
    });
    expect(result.success).toBe(true);
  });

  it("requires avatarKey when mode is AVATAR", () => {
    const result = tryOnInputSchema.safeParse({
      heightCm: 170,
      weightKg: 60,
      fitPreference: "REGULAR",
      inputMode: "AVATAR",
    });
    expect(result.success).toBe(false);
  });

  it("requires photoUploadId when mode is USER_PHOTO", () => {
    const result = tryOnInputSchema.safeParse({
      heightCm: 170,
      weightKg: 60,
      fitPreference: "REGULAR",
      inputMode: "USER_PHOTO",
    });
    expect(result.success).toBe(false);
  });

  it("accepts AVATAR mode with avatarKey", () => {
    const result = tryOnInputSchema.safeParse({
      heightCm: 170,
      weightKg: 60,
      fitPreference: "REGULAR",
      inputMode: "AVATAR",
      avatarKey: "avatar-female-1",
    });
    expect(result.success).toBe(true);
  });
});
