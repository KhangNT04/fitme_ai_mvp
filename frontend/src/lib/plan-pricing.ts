import { formatDateTimeDMY, parseApiDate } from "@/lib/date-format";

export interface PlanDiscountFields {
  priceVnd: number;
  discountPercent?: number | null;
  discountStartsAt?: string | null;
  discountEndsAt?: string | null;
}

/** Mirrors backend PlanPricing: percent > 0 and now within [start, end]; a missing bound is open. */
export function isDiscountActive(plan: Omit<PlanDiscountFields, "priceVnd">, now: Date = new Date()): boolean {
  const percent = plan.discountPercent ?? 0;
  if (percent <= 0) return false;
  const starts = parseApiDate(plan.discountStartsAt);
  const ends = parseApiDate(plan.discountEndsAt);
  const t = now.getTime();
  return (!starts || t >= starts.getTime()) && (!ends || t <= ends.getTime());
}

/** List price minus {@code percent}, rounded half-up to whole VND. */
export function discountedPrice(listPriceVnd: number, percent: number): number {
  if (percent <= 0) return listPriceVnd;
  return Math.round((listPriceVnd * (100 - Math.min(percent, 100))) / 100);
}

export function effectivePrice(plan: PlanDiscountFields, now: Date = new Date()): number {
  return isDiscountActive(plan, now) ? discountedPrice(plan.priceVnd, plan.discountPercent ?? 0) : plan.priceVnd;
}

/** "từ 01/10/2026 00:00 đến 31/10/2026 23:59", "đến ...", "từ ..." or "" when both bounds are open. */
export function formatDiscountWindow(startsAt?: string | null, endsAt?: string | null): string {
  const hasStart = parseApiDate(startsAt) !== null;
  const hasEnd = parseApiDate(endsAt) !== null;
  if (hasStart && hasEnd) return `từ ${formatDateTimeDMY(startsAt)} đến ${formatDateTimeDMY(endsAt)}`;
  if (hasEnd) return `đến ${formatDateTimeDMY(endsAt)}`;
  if (hasStart) return `từ ${formatDateTimeDMY(startsAt)}`;
  return "";
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** API timestamp -> value for an <input type="datetime-local"> (browser local time), "" when empty. */
export function toDateTimeLocalValue(value: unknown): string {
  const d = parseApiDate(value);
  if (!d) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** <input type="datetime-local"> value (browser local time) -> ISO instant, null when empty or invalid. */
export function fromDateTimeLocalValue(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
