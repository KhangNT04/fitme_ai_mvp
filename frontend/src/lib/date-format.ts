/** Accepts ISO strings, epoch millis/seconds or Jackson array timestamps. */
export function parseApiDate(value: unknown): Date | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") {
    const ms = value < 1e11 ? value * 1000 : value;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === "string") {
    // Backend may emit zone-less LocalDateTime strings (assume UTC like Instant).
    const iso = /^\d{4}-\d{2}-\d{2}T[\d:.]+$/.test(value) ? `${value}Z` : value;
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (Array.isArray(value) && value.length >= 3) {
    const [y, mo, da, h = 0, mi = 0, s = 0] = value as number[];
    const d = new Date(Date.UTC(y, mo - 1, da, h, mi, s));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

const BUSINESS_TIME_ZONE = "Asia/Ho_Chi_Minh";

const dmyFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: BUSINESS_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const hmFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: BUSINESS_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** dd/MM/yyyy in Vietnam time, or "—" when the value is not a date. */
export function formatDateDMY(value: unknown): string {
  const d = parseApiDate(value);
  return d ? dmyFormatter.format(d) : "—";
}

/** dd/MM/yyyy HH:mm in Vietnam time, or "—" when the value is not a date. */
export function formatDateTimeDMY(value: unknown): string {
  const d = parseApiDate(value);
  return d ? `${dmyFormatter.format(d)} ${hmFormatter.format(d)}` : "—";
}

export function formatApiDate(value: unknown, withTime = true): string {
  const d = parseApiDate(value);
  if (!d) return "—";
  return withTime
    ? d.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })
    : d.toLocaleDateString("vi-VN");
}
