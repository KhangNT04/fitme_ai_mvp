import type { TrafficLevel, TrafficScale, TrafficStats, TrafficTrend, TrafficVolatility } from "@/types/analytics";

type Tone = "good" | "neutral" | "warn" | "bad" | "muted";

export const TREND_LABELS: Record<TrafficTrend, { label: string; tone: Tone }> = {
  STRONG_UP: { label: "Tăng mạnh", tone: "good" },
  UP: { label: "Tăng", tone: "good" },
  STABLE: { label: "Ổn định", tone: "neutral" },
  DOWN: { label: "Giảm", tone: "warn" },
  STRONG_DOWN: { label: "Giảm mạnh", tone: "bad" },
  NO_DATA: { label: "Chưa đủ dữ liệu", tone: "muted" },
};

export const LEVEL_LABELS: Record<TrafficLevel, { label: string; tone: Tone }> = {
  HIGH: { label: "Cao hơn mức trung bình", tone: "good" },
  NORMAL: { label: "Bình thường", tone: "neutral" },
  LOW: { label: "Thấp hơn mức trung bình", tone: "warn" },
  NO_DATA: { label: "Chưa đủ dữ liệu", tone: "muted" },
};

export const SCALE_LABELS: Record<TrafficScale, { label: string; hint: string; tone: Tone }> = {
  VERY_LOW: { label: "Rất thấp", hint: "dưới 10 khách/ngày", tone: "bad" },
  LOW: { label: "Thấp", hint: "10–49 khách/ngày", tone: "warn" },
  MEDIUM: { label: "Trung bình", hint: "50–199 khách/ngày", tone: "neutral" },
  GOOD: { label: "Khá", hint: "200–999 khách/ngày", tone: "good" },
  HIGH: { label: "Cao", hint: "từ 1.000 khách/ngày", tone: "good" },
};

export const VOLATILITY_LABELS: Record<TrafficVolatility, { label: string; tone: Tone }> = {
  STABLE: { label: "Đều đặn", tone: "good" },
  MODERATE: { label: "Dao động vừa", tone: "neutral" },
  HIGH: { label: "Biến động mạnh", tone: "warn" },
};

const WEEKDAY_NAMES = ["", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];
const WEEKDAY_SHORT = ["", "T2", "T3", "T4", "T5", "T6", "T7", "CN"];

export function weekdayName(isoDay: number, short = false): string {
  return (short ? WEEKDAY_SHORT : WEEKDAY_NAMES)[isoDay] ?? "";
}

export function shortDate(iso: string): string {
  const [, month, day] = iso.split("-");
  return `${day}/${month}`;
}

export function monthLabel(iso: string): string {
  const [year, month] = iso.split("-");
  return `${month}/${year}`;
}

/** "+12,5%" / "-3%" / "—" (no baseline). */
export function formatChange(pct: number | null | undefined): string {
  if (pct == null) return "—";
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`;
}

function formatAvg(value: number): string {
  return value.toLocaleString("vi-VN", { maximumFractionDigits: 1 });
}

/** Trailing moving average (partial window at the start of the series). */
export function movingAverage(values: number[], window = 7): number[] {
  return values.map((_, index) => {
    const slice = values.slice(Math.max(0, index - window + 1), index + 1);
    const avg = slice.reduce((sum, v) => sum + v, 0) / slice.length;
    return Math.round(avg * 10) / 10;
  });
}

/** Plain-language reading of the traffic chart for the "Đánh giá" card. */
export function buildTrafficInsights(stats: TrafficStats): string[] {
  const a = stats.assessment;
  if (a.trend === "NO_DATA" && a.avgDailyVisitors === 0) {
    return [
      "Chưa có đủ lượt truy cập để đánh giá. Số liệu bắt đầu được ghi nhận từ khi tính năng thống kê được bật.",
    ];
  }
  const lines: string[] = [];
  const trend = TREND_LABELS[a.trend].label.toLowerCase();
  lines.push(
    a.trendChangePct == null
      ? `7 ngày gần nhất: trung bình ${formatAvg(a.recentAvgDailyVisitors)} khách/ngày (tuần trước chưa có dữ liệu để so sánh).`
      : `7 ngày gần nhất: trung bình ${formatAvg(a.recentAvgDailyVisitors)} khách/ngày, ${trend} ${formatChange(a.trendChangePct)} so với 7 ngày trước.`,
  );
  const scale = SCALE_LABELS[a.scale];
  lines.push(
    `Trung bình 30 ngày: ${formatAvg(a.avgDailyVisitors)} khách/ngày — quy mô ${scale.label.toLowerCase()} (${scale.hint}).`,
  );
  if (a.peakDate) {
    lines.push(`Ngày đông nhất: ${shortDate(a.peakDate)} với ${a.peakVisitors.toLocaleString("vi-VN")} khách.`);
  }
  if (a.busiestWeekday) {
    lines.push(`${weekdayName(a.busiestWeekday)} thường đông khách nhất trong tuần.`);
  }
  lines.push(
    `${Math.round(a.returningRate * 100)}% khách quay lại từ 2 ngày trở lên; trung bình ${formatAvg(a.pagesPerVisit)} trang mỗi lượt truy cập.`,
  );
  if (a.volatility === "HIGH") {
    lines.push("Lượng truy cập biến động mạnh giữa các ngày — thường do chiến dịch hoặc bài đăng ngắn ngày.");
  }
  if (a.trend === "DOWN" || a.trend === "STRONG_DOWN") {
    lines.push("Gợi ý: kiểm tra lại các kênh quảng bá và nội dung mạng xã hội gần đây.");
  } else if (a.trend === "STRONG_UP") {
    lines.push("Gợi ý: tận dụng đà tăng bằng ưu đãi hoặc bộ sưu tập mới để giữ chân khách.");
  }
  return lines;
}
