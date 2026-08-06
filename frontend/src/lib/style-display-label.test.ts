import { describe, expect, it } from "vitest";
import { confidenceLabelVi, toStyleDisplayLabel } from "./style-display-label";

describe("toStyleDisplayLabel", () => {
  it("maps Office Chic to Đi làm", () => {
    expect(toStyleDisplayLabel("Office Chic")).toBe("Đi làm");
  });

  it("maps Streetwear and Sporty to VN occasion labels", () => {
    expect(toStyleDisplayLabel("Streetwear")).toBe("Đi chơi");
    expect(toStyleDisplayLabel("Sporty")).toBe("Thể thao");
  });

  it("passes through already-localized labels", () => {
    expect(toStyleDisplayLabel("Đi làm")).toBe("Đi làm");
  });
});

describe("confidenceLabelVi", () => {
  it("maps LOW to Thấp", () => {
    expect(confidenceLabelVi("LOW")).toBe("Thấp");
  });
});
