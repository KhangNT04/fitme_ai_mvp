import { describe, expect, it } from "vitest";
import { unwrap, type ApiResponse } from "./api-client";

describe("unwrap", () => {
  it("extracts data from ApiResponse wrapper", () => {
    const payload = { id: "rec-1", title: "Casual look" };
    const response = {
      data: {
        success: true,
        data: payload,
      } satisfies ApiResponse<typeof payload>,
    };

    expect(unwrap(response)).toEqual(payload);
  });

  it("returns raw data when not wrapped in ApiResponse", () => {
    const payload = { id: "rec-2", title: "Office look" };
    const response = { data: payload };

    expect(unwrap(response)).toEqual(payload);
  });
});
