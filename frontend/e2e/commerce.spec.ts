import { test, expect, type Page } from "@playwright/test";
import { loginUser } from "./helpers/auth";

interface ApiVariant {
  id?: string;
  stockQuantity?: number;
}
interface ApiProduct {
  id: string;
  name: string;
  purchasable?: boolean;
  variants?: ApiVariant[];
}

/** Finds a product that can be bought in-app (purchasable + a variant in stock). */
async function findPurchasableProduct(page: Page): Promise<ApiProduct | undefined> {
  const res = await page.request.get("/api/v1/products");
  if (!res.ok()) return undefined;
  const body = (await res.json()) as { data?: ApiProduct[] | { items?: ApiProduct[] } };
  const data = body.data;
  const list: ApiProduct[] = Array.isArray(data) ? data : (data?.items ?? []);
  return list.find((p) => p.purchasable && p.variants?.some((v) => v.id && (v.stockQuantity ?? 0) > 0));
}

async function ensureCheckoutAddress(page: Page) {
  const nameField = page.locator("#checkout-addr-recipientName");
  // Either a saved address is preselected, or the inline "new address" form is shown.
  if (await nameField.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await nameField.fill("E2E Người Nhận");
    await page.locator("#checkout-addr-phone").fill("0901234567");
    await page.locator("#checkout-addr-province").fill("TP. Hồ Chí Minh");
    await page.locator("#checkout-addr-district").fill("Quận 1");
    await page.locator("#checkout-addr-ward").fill("Phường Bến Nghé");
    await page.locator("#checkout-addr-street").fill("12 Nguyễn Huệ");
    await page.getByRole("button", { name: "Lưu & dùng địa chỉ này" }).click();
    await expect(page.getByTestId("checkout-address").first()).toBeVisible({ timeout: 15_000 });
  }
}

test.describe("Commerce flow", () => {
  test("guest is redirected to login from cart and checkout", async ({ page }) => {
    await page.goto("/cart");
    await expect(page).toHaveURL(/\/auth\/login\?redirect=%2Fcart/, { timeout: 15_000 });

    await page.goto("/checkout");
    await expect(page).toHaveURL(/\/auth\/login\?redirect=%2Fcheckout/, { timeout: 15_000 });
  });

  test("login → add to cart → COD checkout → order detail", async ({ page }) => {
    await loginUser(page);

    const product = await findPurchasableProduct(page);
    test.skip(!product, "Seed data has no purchasable product with stock");

    // Product detail: pick default in-stock variant and add to cart.
    await page.goto(`/products/${product!.id}`);
    await expect(page.getByTestId("purchase-panel")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Thêm vào giỏ" }).click();
    await expect(page.getByText("Đã thêm vào giỏ hàng")).toBeVisible({ timeout: 15_000 });

    // Cart: item listed, grouped by brand, can proceed to checkout.
    await page.goto("/cart");
    await expect(page.getByTestId("cart-group").first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("cart-item").first()).toBeVisible();
    await page.getByRole("link", { name: "Tiến hành thanh toán" }).click();
    await expect(page).toHaveURL(/\/checkout/);

    // Checkout: address (existing or new), COD (default), place order.
    await ensureCheckoutAddress(page);
    await expect(page.getByTestId("price-total")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("payment-cod").click();
    await page.getByRole("button", { name: "Đặt hàng", exact: true }).click();

    // COD orders are confirmed immediately and open the order detail page.
    await expect(page).toHaveURL(/\/orders\/[0-9a-f-]{36}/, { timeout: 30_000 });
    await expect(page.getByTestId("order-code")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Đã xác nhận").first()).toBeVisible();
    await expect(page.getByText("Chưa thanh toán").first()).toBeVisible();
    await expect(page.getByTestId("seller-order-card").first()).toBeVisible();
    await expect(page.getByTestId("cancel-order")).toBeVisible();

    // The order shows up in the orders list.
    await page.goto("/orders");
    await expect(page.getByTestId("order-card").first()).toBeVisible({ timeout: 15_000 });
  });
});
