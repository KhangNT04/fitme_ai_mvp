import { describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { adminProductQueryKey, invalidateProductModeration } from "./admin-moderation-cache";

describe("invalidateProductModeration", () => {
  it("invalidates the product detail, both moderation lists and the dashboard", async () => {
    const client = new QueryClient();
    const keys = [
      ["admin-pending-products"],
      ["admin-flagged-products"],
      adminProductQueryKey("p1"),
      adminProductQueryKey("p2"),
      ["admin-dashboard"],
    ];
    keys.forEach((key) => client.setQueryData(key, {}));

    await invalidateProductModeration(client, "p1");

    const stale = (key: readonly unknown[]) => client.getQueryState(key)?.isInvalidated;
    expect(stale(["admin-pending-products"])).toBe(true);
    expect(stale(["admin-flagged-products"])).toBe(true);
    expect(stale(adminProductQueryKey("p1"))).toBe(true);
    expect(stale(["admin-dashboard"])).toBe(true);
    expect(stale(adminProductQueryKey("p2"))).toBe(false);
  });
});
