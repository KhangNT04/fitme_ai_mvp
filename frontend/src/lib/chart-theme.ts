import type { ChartDataPoint } from "@/types/analytics";

/** Excel-style combo chart palette (bar + line). */
export const CHART_BAR = "#5B9BD5";
export const CHART_LINE = "#ED7D31";

export const CHART_COLORS = [
  CHART_BAR,
  CHART_LINE,
  "#70AD47",
  "#FFC000",
  "#4472C4",
  "#A5A5A5",
  "#264478",
  "#9E480E",
] as const;

export const CHART_GRID = "#E8E8E8";
export const CHART_AXIS = "#6B7280";

export function formatChartNumber(value: number): string {
  return new Intl.NumberFormat("vi-VN").format(value);
}

export function formatChartPercent(value: number, total: number): string {
  if (total <= 0) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}

export function sortChartData(data: ChartDataPoint[]): ChartDataPoint[] {
  return [...data].sort((a, b) => b.value - a.value);
}

export function chartTotal(data: ChartDataPoint[]): number {
  return data.reduce((sum, point) => sum + point.value, 0);
}

export interface ComboChartRow extends ChartDataPoint {
  share: number;
}

export function toComboChartData(data: ChartDataPoint[]): ComboChartRow[] {
  const total = chartTotal(data);
  return data.map((point) => ({
    ...point,
    share: total > 0 ? Math.round((point.value / total) * 1000) / 10 : 0,
  }));
}

export function preferHorizontalLayout(data: ChartDataPoint[]): boolean {
  if (data.length === 0) return false;
  return data.length > 6 || data.some((point) => point.name.length > 12);
}

export function truncateChartLabel(label: string, max = 18): string {
  if (label.length <= max) return label;
  return `${label.slice(0, max - 1)}…`;
}
