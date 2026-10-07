/** "12,5%" style percentage for a 0..1 ratio; "—" when there is no data. */
export function formatRate(rate: number | null | undefined, digits = 1): string {
  if (rate == null || Number.isNaN(rate)) return "—";
  return `${(rate * 100).toFixed(digits).replace(".", ",")}%`;
}

export const HEATMAP_EMPTY_CLASS = "bg-muted/40 text-muted-foreground";

/** Cohort heatmap cell background: darker = larger share of the cohort came back that week. */
export function heatmapShadeClass(rate: number | null | undefined): string {
  if (rate == null || Number.isNaN(rate)) return HEATMAP_EMPTY_CLASS;
  if (rate <= 0) return "bg-white text-muted-foreground";
  if (rate < 0.1) return "bg-violet-50 text-violet-900";
  if (rate < 0.25) return "bg-violet-100 text-violet-900";
  if (rate < 0.5) return "bg-violet-200 text-violet-950";
  if (rate < 0.75) return "bg-violet-400 text-white";
  return "bg-violet-600 text-white";
}

/** "dd/MM/yyyy" from an ISO calendar day ("2026-10-07") without timezone shifts. */
export function formatIsoDay(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return "—";
  return `${day}/${month}/${year}`;
}

/** "29/09 – 05/10" for the ISO week starting on `weekStart` (Monday). */
export function formatWeekRange(weekStart: string): string {
  const [year, month, day] = weekStart.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, day));
  const end = new Date(start.getTime() + 6 * 86_400_000);
  const dm = (d: Date) => `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  return `${dm(start)} – ${dm(end)}`;
}
