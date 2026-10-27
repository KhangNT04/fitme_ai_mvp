import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { IntrinsicImage } from "./IntrinsicImage";

describe("IntrinsicImage", () => {
  it("keeps the photo visible once it has loaded", () => {
    const { container } = render(<IntrinsicImage src="https://cdn.example/outfit.jpg" alt="Outfit" />);

    const img = screen.getByAltText("Outfit") as HTMLImageElement;
    // Before the load the photo is hidden so no broken box is shown.
    expect(img.className).toContain("opacity-0");

    fireEvent.load(img);
    expect(img.className).not.toContain("opacity-0");
    expect(container.querySelector("img")).toBe(img);
  });

  it("never crops the photo with object-cover", () => {
    render(<IntrinsicImage src="https://cdn.example/outfit.jpg" alt="Outfit" />);

    const img = screen.getByAltText("Outfit");
    expect(img.className).not.toContain("object-cover");
    expect(img.className).toContain("object-contain");
  });

  it("falls back to the placeholder for an empty source", () => {
    render(<IntrinsicImage src={null} alt="Outfit" />);

    const img = screen.getByAltText("Outfit") as HTMLImageElement;
    expect(img.getAttribute("src")).toBe("/placeholder-product.svg");
  });

  it("keeps a box size even when the photo is missing", () => {
    render(<IntrinsicImage src="https://cdn.example/missing.jpg" alt="Outfit" />);

    const wrapper = screen.getByAltText("Outfit").parentElement as HTMLElement;
    // The grid row must not collapse because the upload is gone.
    expect(wrapper.style.aspectRatio).toContain("0.75");
  });

  it("hides the photo when loading fails but keeps the box", () => {
    render(<IntrinsicImage src="https://cdn.example/missing.jpg" alt="Outfit" />);

    const img = screen.getByAltText("Outfit") as HTMLImageElement;
    fireEvent.error(img);
    expect(img.className).toContain("opacity-0");
  });
  it("shows a hint when the photo cannot be loaded", () => {
    render(<IntrinsicImage src="https://cdn.example/missing.jpg" alt="Outfit" showErrorHint />);

    fireEvent.error(screen.getByAltText("Outfit"));
    expect(screen.getByText(/Ảnh không tải được/i)).toBeInTheDocument();
  });

  it("uses the real ratio once the photo has loaded", () => {
    render(<IntrinsicImage src="https://cdn.example/outfit.jpg" alt="Outfit" />);

    const img = screen.getByAltText("Outfit") as HTMLImageElement;
    Object.defineProperty(img, "naturalWidth", { value: 1600, configurable: true });
    Object.defineProperty(img, "naturalHeight", { value: 900, configurable: true });
    fireEvent.load(img);

    const wrapper = img.parentElement as HTMLElement;
    expect(wrapper.style.aspectRatio).toContain(String(1600 / 900));
  });
});
