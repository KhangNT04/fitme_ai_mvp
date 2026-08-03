export function isSameMonth(iso?: string | null, now = new Date()): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

export function matchesPurchaseSearch(
  item: {
    productName?: string;
    brandName?: string | null;
    channel?: string;
    selectedColor?: string;
    selectedSize?: string;
  },
  q: string,
): boolean {
  if (!q.trim()) return true;
  const hay = [item.productName, item.brandName, item.channel, item.selectedColor, item.selectedSize]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(q.trim().toLowerCase());
}
