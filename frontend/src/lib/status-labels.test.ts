import { describe, expect, it } from "vitest";
import { brandStatusLabel, productStatusLabel } from "./status-labels";

describe("productStatusLabel", () => {
  it("maps known product statuses to Vietnamese", () => {
    expect(productStatusLabel("DRAFT")).toBe("Bản nháp");
    expect(productStatusLabel("PENDING_REVIEW")).toBe("Chờ duyệt");
    expect(productStatusLabel("ACTIVE")).toBe("Đang hiển thị");
  });
});

describe("brandStatusLabel", () => {
  it("maps known brand statuses to Vietnamese", () => {
    expect(brandStatusLabel("APPROVED")).toBe("Đã duyệt");
    expect(brandStatusLabel("PENDING")).toBe("Chờ duyệt");
  });
});
