import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  BrandProductForm,
  LIVE_PRODUCT_REVIEW_HINT,
  emptyBrandProductForm,
  movedBackToReview,
  productToFormValues,
} from "./BrandProductForm";
import { PLACEHOLDER_PRODUCT } from "@/lib/media-url";

describe("productToFormValues", () => {
  const product = {
    name: "Áo",
    category: "Áo",
    price: 299000,
    colors: [],
    sizes: [],
    fitType: "REGULAR",
    styleTags: [],
    occasionTags: [],
    purchaseUrl: "https://shop.vn/p/1",
  };

  it("keeps stored photo paths as they are", () => {
    const form = productToFormValues({ ...product, images: ["/uploads/a.jpg", "https://cdn.vn/b.jpg"], tryOnImage: "/uploads/a.jpg" });
    expect(form.imageUrls).toBe("/uploads/a.jpg\nhttps://cdn.vn/b.jpg");
    expect(form.tryOnImage).toBe("/uploads/a.jpg");
  });

  it("drops the display placeholder of a product without photos", () => {
    expect(productToFormValues({ ...product, images: [PLACEHOLDER_PRODUCT] }).imageUrls).toBe("");
  });
});

describe("movedBackToReview", () => {
  it("is true only when a live product comes back pending review", () => {
    expect(movedBackToReview("ACTIVE", "PENDING_REVIEW")).toBe(true);
    expect(movedBackToReview("ACTIVE", "ACTIVE")).toBe(false);
    expect(movedBackToReview("DRAFT", "PENDING_REVIEW")).toBe(false);
    expect(movedBackToReview("PENDING_REVIEW", "PENDING_REVIEW")).toBe(false);
    expect(movedBackToReview(undefined, "PENDING_REVIEW")).toBe(false);
  });
});

describe("BrandProductForm", () => {
  const renderForm = (live?: boolean) =>
    render(
      <BrandProductForm
        form={emptyBrandProductForm()}
        setForm={vi.fn()}
        onSubmit={vi.fn()}
        live={live}
      />,
    );

  it("warns that media and purchase link edits of a live product need re-review", () => {
    renderForm(true);
    expect(screen.getAllByText(LIVE_PRODUCT_REVIEW_HINT)).toHaveLength(2);
    expect(screen.getByLabelText("Link mua hàng")).toHaveAccessibleDescription(
      expect.stringContaining(LIVE_PRODUCT_REVIEW_HINT),
    );
  });

  it("hides the re-review hint for products that are not live", () => {
    renderForm(false);
    expect(screen.queryByText(LIVE_PRODUCT_REVIEW_HINT)).toBeNull();
  });
});
