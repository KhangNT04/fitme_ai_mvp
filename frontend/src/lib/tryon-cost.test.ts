import { describe, expect, it } from "vitest";
import { needsFitkenTopUp, tryOnCostLabel } from "./tryon-cost";
import type { TryOnQuote } from "@/types/tryon";

const quote = (overrides: Partial<TryOnQuote> = {}): TryOnQuote => ({
  free: false,
  freeRemainingToday: 0,
  freeDailyLimit: 3,
  fitkenCost: 1,
  allPlus: false,
  ...overrides,
});

describe("tryOnCostLabel", () => {
  it("shows the free tries left for an all-Plus outfit", () => {
    expect(tryOnCostLabel(quote({ free: true, allPlus: true, freeRemainingToday: 2 }), { balance: 0, tryOnCost: 1 }))
      .toBe("Miễn phí (còn 2 lượt hôm nay)");
  });

  it("explains the charge once today's free tries are used up", () => {
    expect(tryOnCostLabel(quote({ allPlus: true, fitkenCost: 2 }), null)).toBe("Hết lượt miễn phí hôm nay · Tốn 2 Fitken");
  });

  it("shows a plain Fitken cost for regular outfits or when free tries are switched off", () => {
    expect(tryOnCostLabel(quote(), null)).toBe("Tốn 1 Fitken");
    expect(tryOnCostLabel(quote({ allPlus: true, freeDailyLimit: 0 }), null)).toBe("Tốn 1 Fitken");
  });

  it("falls back to the wallet cost until the quote loads", () => {
    expect(tryOnCostLabel(undefined, { balance: 3, tryOnCost: 1 })).toBe("Tốn 1 Fitken");
    expect(tryOnCostLabel(undefined, undefined)).toBeNull();
  });
});

describe("needsFitkenTopUp", () => {
  it("lets a user with no Fitken take a free Plus try-on", () => {
    expect(needsFitkenTopUp(quote({ free: true, allPlus: true, freeRemainingToday: 1 }), { balance: 0, tryOnCost: 1 }))
      .toBe(false);
  });

  it("asks for Fitken when the try-on is charged and the balance is short", () => {
    expect(needsFitkenTopUp(quote({ allPlus: true }), { balance: 0, tryOnCost: 1 })).toBe(true);
    expect(needsFitkenTopUp(undefined, { balance: 0, tryOnCost: 1 })).toBe(true);
    expect(needsFitkenTopUp(quote(), { balance: 1, tryOnCost: 1 })).toBe(false);
  });

  it("never blocks before the wallet is known", () => {
    expect(needsFitkenTopUp(quote(), undefined)).toBe(false);
  });
});
