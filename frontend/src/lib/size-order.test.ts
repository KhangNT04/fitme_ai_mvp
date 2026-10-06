import { describe, expect, it } from "vitest";
import { sortSizeLabels } from "./size-order";

describe("sortSizeLabels", () => {
  it("orders letter sizes S to XL regardless of input order", () => {
    expect(sortSizeLabels(["M", "L", "XL", "S"])).toEqual(["S", "M", "L", "XL"]);
  });

  it("puts free size before numeric sizes and sorts numbers ascending", () => {
    expect(sortSizeLabels(["32", "28", "Free Size", "30"])).toEqual(["Free Size", "28", "30", "32"]);
  });
});
