import { test, expect } from "@playwright/test";
import { loginUser, loginBrand, loginAdmin, DEMO_PASSWORD } from "./helpers/auth";
import {
  completeConsultationToResult,
  ensureSessionViaHome,
  fillBodyProfile,
  fillStyleProfile,
  fillOccasion,
} from "./helpers/consultation";
import { fillBrandProductForm } from "./helpers/brand";
import { BRAND_PAGES, ADMIN_PAGES, expectPageHeading } from "./helpers/portal";
import {
  uniqueEmail,
  registerUser,
  submitBrandApplication,
  approveBrandAsAdmin,
} from "./helpers/roles";

test.describe.configure({ mode: "serial" });
test.setTimeout(120_000);

test.describe("Luồng công khai (không đăng nhập)", () => {
  test("tư vấn outfit ẩn danh → kết quả AI", async ({ page }) => {
    await completeConsultationToResult(page);
    await expect(page.getByText(/Giải thích AI/)).toBeVisible();
  });

  test("thử mặc AI → kết quả preview", async ({ page }) => {
    await ensureSessionViaHome(page);
    await page.goto("/try-on");
    const productLink = page.getByRole("link", { name: "Xem" }).first();
    await expect(productLink).toBeVisible({ timeout: 30_000 });
    const productId = (await productLink.getAttribute("href"))?.split("/").pop();
    await page.goto(`/try-on?product=${productId}`);
    await page.getByRole("button", { name: "Tiếp tục thử outfit" }).click();
    await page.waitForURL("**/try-on/selected");
    await page.getByRole("button", { name: "Tiếp tục nhập thông tin" }).click();
    await page.waitForURL("**/try-on/input");
    await page.getByRole("spinbutton").nth(0).fill("168");
    await page.getByRole("spinbutton").nth(1).fill("58");
    await page.getByPlaceholder("VD: M").fill("M");
    const combo = page.locator("form [role=combobox]");
    await combo.nth(0).click();
    await page.getByRole("option", { name: /Vừa vặn \(Regular\)/ }).click();
    await combo.nth(1).click();
    await page.getByRole("option", { name: "Đi cafe" }).click();
    await combo.nth(2).click();
    await page.getByRole("option", { name: "Gọn gàng" }).click();
    await page.getByRole("button", { name: "Tạo preview thử mặc" }).click();
    await page.waitForURL(/\/try-on\/result\//, { timeout: 90_000 });
    await expect(page.getByRole("heading", { name: "Kết quả thử mặc AI" })).toBeVisible();
  });

  test("khám phá → chi tiết sản phẩm → chuyển hướng mua", async ({ page }) => {
    await page.goto("/discover");
    await page.getByRole("link", { name: "Xem" }).first().click();
    await page.waitForURL("**/products/**");
    await page.getByRole("link", { name: "Mua ngay" }).click();
    await page.waitForURL("**/redirect/confirm/**");
    await page.getByRole("button", { name: "Tiếp tục đến nơi bán" }).click();
    await page.waitForURL("**/redirect/loading**", { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: "Đang chuyển hướng..." })).toBeVisible();
  });
});

test.describe("Luồng USER", () => {
  test("đăng nhập → hồ sơ → tủ đồ / gợi ý đã lưu", async ({ page }) => {
    await loginUser(page);
    await expect(page.getByRole("heading", { name: "Hồ sơ của tôi" })).toBeVisible();
    await page.locator("main").getByRole("link", { name: "Tủ đồ" }).click();
    await expect(page).toHaveURL(/\/wardrobe/);
    await page.goto("/profile");
    await page.locator("main").getByRole("link", { name: "Gợi ý đã lưu" }).click();
    await expect(page).toHaveURL(/\/saved-outfits/);
  });

  test("quên mật khẩu → xác nhận MVP", async ({ page }) => {
    await page.goto("/auth/forgot-password");
    await page.locator('input[type="email"]').fill("user@fitme.ai");
    await page.getByRole("button", { name: "Gửi link đặt lại" }).click();
    await expect(page.getByText(/token đặt lại mật khẩu đã được tạo/)).toBeVisible();
    await expect(page.getByRole("link", { name: "Nhập token để đặt lại mật khẩu" })).toBeVisible();
  });

  test("quyền riêng tư → gửi yêu cầu xóa session", async ({ page }) => {
    await loginUser(page);
    await page.goto("/profile/privacy");
    await expect(page.getByRole("heading", { name: "Quyền riêng tư & dữ liệu" })).toBeVisible();
    await page.getByRole("button", { name: "Gửi yêu cầu" }).click();
    await expect(
      page.getByText("Yêu cầu xóa dữ liệu đã được ghi nhận"),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("tư vấn từ sản phẩm → lưu gợi ý → danh sách đã lưu", async ({ page }) => {
    await loginUser(page);
    await page.goto("/discover");
    await page.getByRole("link", { name: "Xem" }).first().click();
    await page.getByRole("button", { name: /Tư vấn size & phối đồ bằng AI/ }).click();
    await fillBodyProfile(page);
    await fillStyleProfile(page);
    await fillOccasion(page);
    await page.waitForURL(/\/ai\/result\//, { timeout: 90_000 });

    const title = await page.getByRole("heading", { level: 1 }).textContent();
    const saveResponse = page.waitForResponse(
      (resp) =>
        resp.url().includes("/recommendations/") &&
        resp.url().includes("/save") &&
        resp.request().method() === "POST" &&
        resp.status() === 200,
    );
    await page.getByRole("button", { name: "Lưu gợi ý" }).click();
    await saveResponse;
    await page.goto("/saved-outfits");
    await expect(page.getByText(title!).first()).toBeVisible({ timeout: 15_000 });
  });

  test("tủ đồ → thêm item → tư vấn ưu tiên tủ đồ", async ({ page }) => {
    const itemName = `Áo sơ mi trắng E2E ${Date.now()}`;
    await loginUser(page);
    await page.goto("/wardrobe");
    await page.getByRole("button", { name: "Thêm item", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.locator("input").first().fill(itemName);
    await dialog.locator("select").selectOption({ index: 1 });
    await dialog.locator("input").nth(1).fill("Trắng");
    await page.getByRole("button", { name: "Lưu item" }).click();
    await expect(page.getByRole("heading", { name: itemName }).first()).toBeVisible({ timeout: 15_000 });

    await page.goto("/ai/start");
    await page.getByRole("button", { name: "Bắt đầu nhập thông tin" }).click();
    await fillBodyProfile(page);
    await fillStyleProfile(page);
    await fillOccasion(page, "Ưu tiên tủ đồ của tôi");
    await page.waitForURL(/\/ai\/result\//, { timeout: 90_000 });
    await expect(page.getByText("Bạn đã có").first()).toBeVisible();
  });
});

test.describe("Luồng BRAND", () => {
  test.beforeEach(async ({ page }) => {
    await loginBrand(page);
  });

  for (const { path, heading } of BRAND_PAGES) {
    test(`portal ${path}`, async ({ page }) => {
      await expectPageHeading(page, path, heading);
    });
  }

  test("tạo sản phẩm → gửi duyệt", async ({ page }) => {
    const productName = `RoleFlow Brand ${Date.now()}`;
    await page.goto("/brand/products/new");
    await fillBrandProductForm(page, productName);
    await page.getByRole("button", { name: "Tạo sản phẩm" }).click();
    await expect(page.getByRole("button", { name: "Gửi duyệt" })).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Gửi duyệt" }).click();
    await page.waitForURL(/\/brand\/products$/);
    await expect(page.getByText("Chờ duyệt").first()).toBeVisible();
  });
});

test.describe("Luồng ADMIN", () => {
  test.beforeEach(async ({ page }) => {
    await loginAdmin(page);
  });

  for (const { path, heading } of ADMIN_PAGES) {
    test(`portal ${path}`, async ({ page }) => {
      await expectPageHeading(page, path, heading);
    });
  }

  test("duyệt sản phẩm pending (nếu có)", async ({ page }) => {
    await page.goto("/admin/products/moderation");
    const approveBtn = page.getByRole("button", { name: "Duyệt" }).first();
    if (await approveBtn.isVisible().catch(() => false)) {
      await approveBtn.click();
      await expect(page.getByText("ACTIVE").first()).toBeVisible({ timeout: 15_000 });
    }
  });
});

test.describe("Luồng liên role — Brand application", () => {
  test.setTimeout(180_000);

  test("USER đăng ký → gửi đơn brand → ADMIN duyệt → đăng nhập brand portal", async ({
    page,
  }) => {
    const email = uniqueEmail("brand-apply");
    const brandName = `E2E Brand Co ${Date.now()}`;

    await registerUser(page, email, { redirect: "/brand/onboarding" });
    await submitBrandApplication(page, brandName, email);

    await loginAdmin(page);
    await approveBrandAsAdmin(page, brandName);

    await page.goto("/brand/login");
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(DEMO_PASSWORD);
    await page.getByRole("button", { name: "Đăng nhập" }).click();
    await page.waitForURL(/\/brand\/dashboard/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: "Tổng quan" })).toBeVisible();
  });
});
