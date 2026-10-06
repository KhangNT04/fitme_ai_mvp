/** Consumer-facing FitMe Premium copy shared by pricing, upsell cards and locked features. */
export const PREMIUM_PLAN_NAME = "FitMe Premium";
export const FREE_PLAN_NAME = "FitMe Free";

export const PREMIUM_PERKS = [
  "Tùy biến phối đồ theo brand yêu thích",
  "Tủ đồ cá nhân và phối kèm đồ có sẵn",
  "Fitken hàng tháng để thử đồ AI",
] as const;

export function formatVnd(amount: number): string {
  return `${Math.round(amount).toLocaleString("vi-VN")}đ`;
}

/** "49.000đ/tháng" from the plan price; null when the plan is not loaded or free. */
export function premiumPriceLabel(priceVnd: number | null | undefined): string | null {
  if (priceVnd == null || priceVnd <= 0) return null;
  return `${formatVnd(priceVnd)}/tháng`;
}

/** Upgrade button label, e.g. "Nâng cấp Premium 49.000đ/tháng". */
export function premiumUpgradeCta(priceVnd?: number | null): string {
  const price = premiumPriceLabel(priceVnd);
  return price ? `Nâng cấp Premium ${price}` : "Nâng cấp Premium";
}

/** "Mỗi tháng nhận 15 Fitken" when the plan grants Fitken; generic copy otherwise. */
export function premiumFitkenPerk(monthlyFitken: number | null | undefined): string {
  return monthlyFitken && monthlyFitken > 0
    ? `${monthlyFitken} Fitken mỗi tháng để thử đồ AI`
    : "Fitken hàng tháng để thử đồ AI";
}
