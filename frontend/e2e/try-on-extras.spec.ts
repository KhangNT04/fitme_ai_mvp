import { test, expect } from "@playwright/test";
import { completeTryOnToResult } from "./helpers/tryon";

test.describe("Try-on sub-pages", () => {
  test.setTimeout(180_000);

  test("color, size, form comparison pages load from result", async ({ page }) => {
    const tryOnId = await completeTryOnToResult(page);

    await Promise.all([
      page.waitForURL(new RegExp(`/try-on/color/${tryOnId}`)),
      page.getByRole("link", { name: "Thử màu khác" }).click(),
    ]);
    await expect(page.getByRole("heading", { name: "So sánh màu" })).toBeVisible();

    await page.goto(`/try-on/result/${tryOnId}`);
    await Promise.all([
      page.waitForURL(new RegExp(`/try-on/size/${tryOnId}`)),
      page.getByRole("link", { name: "Thử size khác" }).click(),
    ]);
    await expect(page.getByRole("heading", { name: "So sánh size" })).toBeVisible();

    await page.goto(`/try-on/result/${tryOnId}`);
    await Promise.all([
      page.waitForURL(new RegExp(`/try-on/form/${tryOnId}`)),
      page.getByRole("link", { name: "Thử form khác" }).click(),
    ]);
    await expect(page.getByRole("heading", { name: "So sánh form" })).toBeVisible();
  });

  test("decision page loads from result", async ({ page }) => {
    const tryOnId = await completeTryOnToResult(page);

    await Promise.all([
      page.waitForURL(new RegExp(`/try-on/decision/${tryOnId}`)),
      page.getByRole("link", { name: "Quyết định tiếp theo" }).click(),
    ]);
    await expect(page.getByRole("heading", { name: "Quyết định tiếp theo" })).toBeVisible();
    await expect(page.getByText(/Size gợi ý:/)).toBeVisible();
    await expect(page.getByRole("link", { name: /Mua/ }).first()).toBeVisible();
  });
});
