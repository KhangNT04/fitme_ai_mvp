import { describe, expect, it } from "vitest";
import { formatApiDate, parseApiDate } from "@/lib/date-format";

describe("parseApiDate", () => {
  it("accepts ISO, zone-less, epoch and Jackson array timestamps", () => {
    expect(parseApiDate("2026-10-04T01:00:00Z")?.toISOString()).toBe("2026-10-04T01:00:00.000Z");
    expect(parseApiDate("2026-10-04T01:00:00")?.toISOString()).toBe("2026-10-04T01:00:00.000Z");
    expect(parseApiDate(1759539600)?.getUTCFullYear()).toBe(2025);
    expect(parseApiDate([2026, 10, 4, 1, 0, 0])?.toISOString()).toBe("2026-10-04T01:00:00.000Z");
    expect(parseApiDate(null)).toBeNull();
    expect(parseApiDate("nonsense")).toBeNull();
  });
});

describe("formatApiDate", () => {
  it("falls back to a dash and formats dates in vi-VN", () => {
    expect(formatApiDate(null)).toBe("—");
    expect(formatApiDate("2026-10-04T01:00:00Z", false)).toMatch(/2026/);
  });
});
