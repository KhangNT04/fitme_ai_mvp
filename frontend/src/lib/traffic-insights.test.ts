import { describe, expect, it } from "vitest";
import { buildTrafficInsights, formatChange, movingAverage, weekdayName } from "./traffic-insights";
import { isTrackedPath } from "@/services/traffic-api";
import type { TrafficStats } from "@/types/analytics";

const EMPTY_PERIOD = { visitors: 0, pageViews: 0, newVisitors: 0, previousVisitors: 0, changePct: null };

function stats(assessment: Partial<TrafficStats["assessment"]>): TrafficStats {
  return {
    today: "2026-10-04",
    rangeDays: 30,
    day: EMPTY_PERIOD,
    week: EMPTY_PERIOD,
    month: EMPTY_PERIOD,
    daily: [],
    weekly: [],
    monthly: [],
    weekdays: [],
    assessment: {
      trend: "NO_DATA",
      trendChangePct: null,
      level: "NO_DATA",
      scale: "VERY_LOW",
      volatility: "STABLE",
      avgDailyVisitors: 0,
      recentAvgDailyVisitors: 0,
      peakDate: null,
      peakVisitors: 0,
      busiestWeekday: null,
      returningRate: 0,
      pagesPerVisit: 0,
      ...assessment,
    },
  };
}

describe("traffic insights", () => {
  it("explains that there is not enough data yet", () => {
    const lines = buildTrafficInsights(stats({}));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("Chưa có đủ lượt truy cập");
  });

  it("summarises trend, scale, peak and weekday", () => {
    const lines = buildTrafficInsights(
      stats({
        trend: "STRONG_DOWN",
        trendChangePct: -35.5,
        level: "LOW",
        scale: "MEDIUM",
        volatility: "HIGH",
        avgDailyVisitors: 120,
        recentAvgDailyVisitors: 80,
        peakDate: "2026-09-20",
        peakVisitors: 410,
        busiestWeekday: 6,
        returningRate: 0.25,
        pagesPerVisit: 3.4,
      }),
    ).join("\n");
    expect(lines).toContain("giảm mạnh -35,5%");
    expect(lines).toContain("quy mô trung bình (50–199 khách/ngày)");
    expect(lines).toContain("20/09 với 410 khách");
    expect(lines).toContain("Thứ 7 thường đông khách nhất");
    expect(lines).toContain("25% khách quay lại");
    expect(lines).toContain("biến động mạnh");
    expect(lines).toContain("kiểm tra lại các kênh quảng bá");
  });

  it("formats change and moving averages", () => {
    expect(formatChange(null)).toBe("—");
    expect(formatChange(12.5)).toBe("+12,5%");
    expect(formatChange(-3)).toBe("-3%");
    expect(movingAverage([7, 0, 14, 7], 2)).toEqual([7, 3.5, 7, 10.5]);
    expect(weekdayName(7)).toBe("Chủ nhật");
    expect(weekdayName(1, true)).toBe("T2");
  });

  it("does not count portal pages as storefront traffic", () => {
    expect(isTrackedPath("/")).toBe(true);
    expect(isTrackedPath("/products/abc")).toBe(true);
    expect(isTrackedPath("/brandnew")).toBe(true);
    expect(isTrackedPath("/admin")).toBe(false);
    expect(isTrackedPath("/admin/traffic")).toBe(false);
    expect(isTrackedPath("/brand/products")).toBe(false);
  });
});
