import { describe, expect, it } from "vitest";
import { buyClickContextFromSearch, isSourcePage, redirectConfirmHref } from "./redirect-href";

const TRY_ON_ID = "8f14e45f-ceea-467a-9575-0a6f1f0d2c11";
const RECOMMENDATION_ID = "c9f0f895-fb98-4b91-9e1f-2a3d4b5c6d7e";

function search(href: string) {
  return new URL(href, "http://localhost").searchParams;
}

describe("redirectConfirmHref", () => {
  it("encodes the source page and attribution for the confirm page", () => {
    const href = redirectConfirmHref("p1", {
      sourcePage: "TRY_ON_RESULT",
      tryOnRequestId: TRY_ON_ID,
      selectedSize: "M",
      selectedColor: "Xanh rêu",
    });
    expect(href.startsWith("/redirect/confirm/p1?")).toBe(true);
    expect(buyClickContextFromSearch(search(href))).toEqual({
      sourcePage: "TRY_ON_RESULT",
      tryOnRequestId: TRY_ON_ID,
      selectedSize: "M",
      selectedColor: "Xanh rêu",
    });
  });

  it("omits empty attribution", () => {
    expect(redirectConfirmHref("p1", { sourcePage: "PRODUCT_DETAIL", recommendationId: undefined })).toBe(
      "/redirect/confirm/p1?source=PRODUCT_DETAIL",
    );
  });
});

describe("buyClickContextFromSearch", () => {
  it("defaults to PRODUCT_DETAIL when the source is missing or unknown", () => {
    expect(buyClickContextFromSearch(search("/x"))).toEqual({ sourcePage: "PRODUCT_DETAIL" });
    expect(buyClickContextFromSearch(search("/x?source=CART"))).toEqual({ sourcePage: "PRODUCT_DETAIL" });
  });

  it("keeps AI result attribution", () => {
    expect(
      buyClickContextFromSearch(search(`/x?source=AI_RESULT&recommendation=${RECOMMENDATION_ID}`)),
    ).toEqual({ sourcePage: "AI_RESULT", recommendationId: RECOMMENDATION_ID });
  });

  it("drops ids that are not UUIDs so the backend does not reject the click", () => {
    expect(buyClickContextFromSearch(search("/x?source=TRY_ON_RESULT&tryOn=abc&recommendation=1"))).toEqual({
      sourcePage: "TRY_ON_RESULT",
    });
  });
});

describe("isSourcePage", () => {
  it("accepts only the source pages known to the frontend", () => {
    expect(isSourcePage("PREVIEW")).toBe(true);
    expect(isSourcePage("preview")).toBe(false);
    expect(isSourcePage(null)).toBe(false);
  });
});
