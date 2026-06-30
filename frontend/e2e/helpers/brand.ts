import { type Page } from "@playwright/test";

const SAMPLE_IMAGES = [
  "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=800&h=1000&q=80",
  "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=800&h=1000&q=80",
].join("\n");

export async function fillBrandProductForm(
  page: Page,
  productName: string,
  purchaseUrl = "https://shopee.vn/e2e-test",
) {
  await page.getByText("Tên sản phẩm").locator("..").locator("input").fill(productName);
  await page.locator("select").first().selectOption({ label: "Áo" });
  await page.locator("#targetGender").selectOption("UNISEX");
  await page.getByText("Giá (VND)").locator("..").locator("input").fill("250000");
  await page.getByText("Màu (phân cách bằng dấu phẩy)").locator("..").locator("input").fill("Đen, Navy");
  await page.getByText("Size (phân cách bằng dấu phẩy)").locator("..").locator("input").fill("S, M, L");
  await page.getByText("URL ảnh").locator("..").locator("textarea").fill(SAMPLE_IMAGES);
  await page.getByText("Link mua hàng").locator("..").locator("input").fill(purchaseUrl);
}
