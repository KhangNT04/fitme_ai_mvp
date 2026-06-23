export function formatPrice(price: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(price);
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}
