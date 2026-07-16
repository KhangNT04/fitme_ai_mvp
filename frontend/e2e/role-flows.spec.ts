import { test, expect } from "@playwright/test";
import { loginUser, loginBrand, loginAdmin, DEMO_PASSWORD } from "./helpers/auth";
import {
  completeConsultationToResult,
  fillBodyProfile,
} from "./helpers/consultation";
import { fillBrandProductForm } from "./helpers/brand";
import { BRAND_PAGES, ADMIN_PAGES, expectPageHeading } from "./helpers/portal";
import {
  getFirstProductIdFromDiscover,
  startTryOnWithFirstProduct,
  fillTryOnInputMetrics,
  waitForTryOnResult,
} from "./helpers/tryon";
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
    await expect(page.getByRole("button", { name: "Mặc thử outfit" }).first()).toBeVisible();
  });

  test("thử mặc AI → kết quả preview", async ({ page }) => {
    await startTryOnWithFirstProduct(page);
    await page.getByRole("button", { name: "Tiếp tục nhập thông tin" }).click();
    await page.waitForURL("**/try-on/input");
    await fillTryOnInputMetrics(page);
    await page.getByRole("button", { name: "Tạo preview thử mặc" }).click();
    await waitForTryOnResult(page);
    await expect(page.getByRole("heading", { name: "Kết quả thử mặc AI" })).toBeVisible();
  });

  test("khám phá → chi tiết sản phẩm → chuyển hướng mua", async ({ page }) => {
    const productId = await getFirstProductIdFromDiscover(page);
    await page.goto(`/products/${productId}`);
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
    await page.locator("main").getByRole("link", { name: "Đã lưu" }).click();
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
    const productId = await getFirstProductIdFromDiscover(page);
    await page.goto(`/products/${productId}`);
    await page.getByRole("button", { name: /Tư vấn size & phối đồ bằng AI/ }).click();
    await page.waitForURL(/\/ai\/(body-profile|chat|start)/);
    if (page.url().includes("body-profile") || !page.url().includes("/ai/chat")) {
      await fillBodyProfile(page);
    }
    await page.waitForURL("**/ai/chat", { timeout: 30_000 });

    await page.getByLabel("Tin nhắn tư vấn").fill("Outfit đi làm văn phòng thanh lịch");
    await page.getByRole("button", { name: "Gửi" }).click();
    await expect(page.getByRole("button", { name: "Lưu" }).first()).toBeVisible({
      timeout: 120_000,
    });

    const saveResponse = page.waitForResponse(
      (resp) =>
        resp.url().includes("/recommendations/") &&
        resp.url().includes("/save") &&
        resp.request().method() === "POST" &&
        resp.status() === 200,
    );
    await page.getByRole("button", { name: "Lưu" }).first().click();
    await saveResponse;
    await page.goto("/saved-outfits");
    await expect(page.getByRole("heading", { name: "Đã lưu" })).toBeVisible({ timeout: 15_000 });
  });

  test("tủ đồ → thêm item → tư vấn outfit", async ({ page }) => {
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
    await page.waitForURL(/\/ai\/(body-profile|chat)/, { timeout: 30_000 });
    if (page.url().includes("body-profile")) {
      await fillBodyProfile(page);
    }
    await page.waitForURL("**/ai/chat", { timeout: 30_000 });
    await expect(page.getByText(/Bạn muốn tôi phối đồ|Tư vấn outfit AI/)).toBeVisible();
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
    await expect(page.getByRole("button", { name: "Gửi duyệt" })).toBeVisible({ timeout: 30_000 });
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
