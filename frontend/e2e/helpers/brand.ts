import { type Page } from "@playwright/test";

const SAMPLE_IMAGES = [
  "https://picsum.photos/seed/fitme-e2e-main/400/500",
  "https://picsum.photos/seed/fitme-e2e-detail/400/500",
].join("\n");

export async function fillBrandProductForm(
  page: Page,
  productName: string,
  purchaseUrl = "https://shopee.vn/e2e-test",
) {
  await page.getByText("Tên sản phẩm").locator("..").locator("input").fill(productName);
  await page.locator("select").first().selectOption({ label: "Áo" });
  await page.getByText("Giá (VND)").locator("..").locator("input").fill("250000");
  await page.getByText("Màu (phân cách bằng dấu phẩy)").locator("..").locator("input").fill("Đen, Navy");
  await page.getByText("Size (phân cách bằng dấu phẩy)").locator("..").locator("input").fill("S, M, L");
  await page.getByText("URL ảnh").locator("..").locator("textarea").fill(SAMPLE_IMAGES);
  await page.getByText("Link mua hàng").locator("..").locator("input").fill(purchaseUrl);
}
