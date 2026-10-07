import { describe, expect, it } from "vitest";
import { HEATMAP_EMPTY_CLASS, formatIsoDay, formatRate, formatWeekRange, heatmapShadeClass } from "./retention-format";

describe("formatRate", () => {
  it("formats ratios as Vietnamese percentages", () => {
    expect(formatRate(0.667)).toBe("66,7%");
    expect(formatRate(1)).toBe("100,0%");
    expect(formatRate(0.5, 0)).toBe("50%");
    expect(formatRate(0)).toBe("0,0%");
  });

  it("shows a dash when there is no data", () => {
    expect(formatRate(null)).toBe("—");
    expect(formatRate(undefined)).toBe("—");
  });
});

describe("heatmapShadeClass", () => {
  it("uses the empty style for weeks not reached yet", () => {
    expect(heatmapShadeClass(null)).toBe(HEATMAP_EMPTY_CLASS);
  });

  it("gets darker as retention grows", () => {
    expect(heatmapShadeClass(0)).toContain("bg-white");
    expect(heatmapShadeClass(0.05)).toContain("bg-violet-50");
    expect(heatmapShadeClass(0.1)).toContain("bg-violet-100");
    expect(heatmapShadeClass(0.3)).toContain("bg-violet-200");
    expect(heatmapShadeClass(0.5)).toContain("bg-violet-400");
    expect(heatmapShadeClass(0.74)).toContain("bg-violet-400");
    expect(heatmapShadeClass(1)).toContain("bg-violet-600");
  });
});

describe("formatIsoDay / formatWeekRange", () => {
  it("formats calendar days without timezone shifts", () => {
    expect(formatIsoDay("2026-10-07")).toBe("07/10/2026");
    expect(formatIsoDay(null)).toBe("—");
  });

  it("spans Monday to Sunday across month boundaries", () => {
    expect(formatWeekRange("2026-09-28")).toBe("28/09 – 04/10");
    expect(formatWeekRange("2026-12-28")).toBe("28/12 – 03/01");
  });
});
