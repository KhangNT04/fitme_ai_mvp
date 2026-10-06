import { describe, expect, it } from "vitest";
import { validateSettingValue } from "./settings-api";

const cap = { label: "Trần Fitken miễn phí", min: 0, max: 100000 };

describe("validateSettingValue", () => {
  it("accepts integers inside the range", () => {
    expect(validateSettingValue(cap, "50")).toBeNull();
    expect(validateSettingValue(cap, " 0 ")).toBeNull();
    expect(validateSettingValue(cap, "100000")).toBeNull();
  });

  it("rejects empty and non-integer values in Vietnamese", () => {
    expect(validateSettingValue(cap, "")).toBe('Vui lòng nhập giá trị cho "Trần Fitken miễn phí"');
    expect(validateSettingValue(cap, "1.5")).toBe('"Trần Fitken miễn phí" phải là số nguyên');
    expect(validateSettingValue(cap, "abc")).toBe('"Trần Fitken miễn phí" phải là số nguyên');
  });

  it("rejects values outside the range", () => {
    expect(validateSettingValue(cap, "-1")).toBe('"Trần Fitken miễn phí" phải nằm trong khoảng 0 - 100000');
    expect(validateSettingValue({ label: "X", min: 0, max: 100 }, "101")).toBe('"X" phải nằm trong khoảng 0 - 100');
  });
});
