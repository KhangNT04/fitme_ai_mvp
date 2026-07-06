import { describe, expect, it } from "vitest";
import { resolveOutfitExplanationSummary } from "./outfit-explanation";

describe("resolveOutfitExplanationSummary", () => {
  it("prefers summary from API", () => {
    expect(
      resolveOutfitExplanationSummary({
        summary: "Em gợi ý size S cho bạn.",
        bodyFit: "",
        styleFit: "",
        occasionFit: "",
        colorFit: "",
      }),
    ).toBe("Em gợi ý size S cho bạn.");
  });

  it("joins legacy fields when summary missing", () => {
    expect(
      resolveOutfitExplanationSummary({
        bodyFit: "Size S vừa vặn",
        styleFit: "Dễ mặc hàng ngày",
        occasionFit: "Hợp đi cafe",
        colorFit: "Tông trắng nhẹ",
      }),
    ).toContain("Size S vừa vặn.");
  });
});
