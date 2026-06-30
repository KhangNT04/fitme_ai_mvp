import { describe, expect, it } from "vitest";
import { validateImageFile, MAX_IMAGE_BYTES } from "./upload-file";

describe("validateImageFile", () => {
  it("accepts supported image types within size limit", () => {
    const file = new File(["x"], "photo.jpg", { type: "image/jpeg" });
    Object.defineProperty(file, "size", { value: MAX_IMAGE_BYTES });
    expect(validateImageFile(file)).toBeNull();
  });

  it("rejects unsupported types", () => {
    const file = new File(["x"], "photo.gif", { type: "image/gif" });
    expect(validateImageFile(file)).toMatch(/JPG/);
  });
});
