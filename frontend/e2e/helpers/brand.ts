import { type Page } from "@playwright/test";

export async function fillBrandProductForm(
  page: Page,
  productName: string,
  purchaseUrl = "https://shopee.vn/e2e-test",
) {
  await page.getByText("Tên sản phẩm").locator("..").locator("input").fill(productName);
  await page.locator("select").selectOption({ label: "Áo" });
  await page.getByText("Giá (VND)").locator("..").locator("input").fill("250000");
  await page.getByText("Link mua hàng").locator("..").locator("input").fill(purchaseUrl);
}
