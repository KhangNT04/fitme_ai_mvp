import { describe, expect, it, beforeEach } from "vitest";
import { useTryOnStore } from "./tryon-store";

describe("useTryOnStore", () => {
  beforeEach(() => {
    localStorage.clear();
    useTryOnStore.getState().reset();
  });

  it("addItem adds unique products only", () => {
    const item = { productId: "p1", category: "Áo thun", name: "Shirt", imageUrl: "/x.jpg" };
    expect(useTryOnStore.getState().addItem(item)).toBe("added");
    expect(useTryOnStore.getState().addItem(item)).toBe("unchanged");
    expect(useTryOnStore.getState().selectedItems).toHaveLength(1);
  });

  it("addItem replaces same role with a new product", () => {
    useTryOnStore.getState().addItem({ productId: "p1", category: "Áo thun", name: "Shirt 1" });
    expect(
      useTryOnStore.getState().addItem({ productId: "p2", category: "Áo sơ mi", name: "Shirt 2" }),
    ).toBe("replaced");
    expect(useTryOnStore.getState().selectedItems).toEqual([
      { productId: "p2", category: "Áo sơ mi", name: "Shirt 2" },
    ]);
  });

  it("removeItem removes by productId", () => {
    const item = { productId: "p1", category: "Áo thun", name: "Shirt", imageUrl: "/x.jpg" };
    useTryOnStore.getState().addItem(item);
    useTryOnStore.getState().removeItem("p1");
    expect(useTryOnStore.getState().selectedItems).toHaveLength(0);
  });

  it("setInput and setRequestId update state", () => {
    useTryOnStore.getState().setInput({ heightCm: 170, weightKg: 60 });
    useTryOnStore.getState().setRequestId("req-1");
    expect(useTryOnStore.getState().input.heightCm).toBe(170);
    expect(useTryOnStore.getState().requestId).toBe("req-1");
  });
});
