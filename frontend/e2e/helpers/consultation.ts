import { type Page, expect } from "@playwright/test";

/** Creates anonymous session via home CTA and navigates to AI start gate. */
export async function startAnonymousConsultation(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Bắt đầu tư vấn outfit" }).first().click();
  await page.waitForURL(/\/ai\/(start|body-profile|vibe-quiz|chat)/);
  await page.waitForFunction(
    () => localStorage.getItem("fitme_session_token") !== null,
    undefined,
    { timeout: 15_000 },
  );
}

/** Completes vibe quiz (or skips) and lands on chat. */
export async function fillVibeQuiz(page: Page) {
  if (!page.url().includes("/ai/vibe-quiz")) {
    await page.goto("/ai/vibe-quiz");
  }
  await expect(page.getByRole("button", { name: /Clean girl/i })).toBeVisible({
    timeout: 15_000,
  });
  await page.getByRole("button", { name: /Clean girl/i }).click();
  await page.getByRole("button", { name: /Xong — vào tư vấn/ }).click();
  await page.waitForURL("**/ai/chat", { timeout: 30_000 });
}

export async function fillBodyProfile(page: Page) {
  await page.goto("/ai/body-profile?required=1");
  await page.getByLabel("Chiều cao (cm)").fill("165");
  await page.getByLabel("Cân nặng (kg)").fill("55");
  await page.getByLabel("Tuổi").fill("25");

  const comboboxes = page.locator("form [role=combobox]");
  await comboboxes.nth(0).click();
  await page.getByRole("option", { name: "Nữ", exact: true }).click();
  await comboboxes.nth(1).click();
  await page.getByRole("option", { name: /Vừa vặn \(Regular\)/ }).click();

  // Skin tone swatches (radio), not dropdown
  await page.getByRole("radio", { name: "Trung bình" }).click();

  await page.getByRole("button", { name: /Lưu và bắt đầu tư vấn|Tạo gợi ý outfit/ }).click();
  await page.waitForURL(/\/ai\/(vibe-quiz|chat)/, { timeout: 30_000 });
  if (page.url().includes("/ai/vibe-quiz")) {
    await fillVibeQuiz(page);
  }
}

/** @deprecated Style step removed — no-op kept for older e2e imports. */
export async function fillStyleProfile(_page: Page) {
  /* no-op */
}

/** @deprecated Occasion step removed — no-op kept for older e2e imports. */
export async function fillOccasion(_page: Page, _wardrobeModeLabel?: string) {
  /* no-op */
}

/** Expand a collapsed chat outfit card so Try-on / Save actions are visible. */
export async function expandOutfitCard(page: Page, card = page.locator("[data-recommendation-id]").first()) {
  const expandBtn = card.getByRole("button", { name: "Xem chi tiết" });
  if (await expandBtn.isVisible().catch(() => false)) {
    await expandBtn.click();
  }
  await expect(card.getByRole("button", { name: "Mặc thử outfit" })).toBeVisible({
    timeout: 15_000,
  });
  return card;
}

/** Wait for an outfit card (starter or chat reply), expand it, return recommendation id. */
export async function waitForExpandedOutfitResult(page: Page): Promise<string | null> {
  const card = page.locator("[data-recommendation-id]").first();
  const appeared = await card
    .waitFor({ state: "visible", timeout: 60_000 })
    .then(() => true)
    .catch(() => false);
  if (!appeared) {
    await expect(page.getByLabel("Tin nhắn tư vấn")).toBeEnabled({ timeout: 30_000 });
    const prompt = "Mình muốn outfit streetwear thoải mái đi cafe cuối tuần";
    await page.getByLabel("Tin nhắn tư vấn").fill(prompt);
    await page.getByRole("button", { name: "Gửi" }).click();
    await expect(card).toBeVisible({ timeout: 120_000 });
  }
  await expandOutfitCard(page, card);
  return (await card.getAttribute("data-recommendation-id")) ?? null;
}

/** Full anonymous consultation through body profile → vibe → chat with an outfit reply.
 * Returns first recommendation id when available.
 */
export async function completeConsultationToResult(page: Page): Promise<string | null> {
  await startAnonymousConsultation(page);
  // Gate may land on body-profile, vibe-quiz, or chat
  if (page.url().includes("/ai/body-profile")) {
    await fillBodyProfile(page);
  } else if (page.url().includes("/ai/vibe-quiz")) {
    await fillVibeQuiz(page);
  } else if (!page.url().includes("/ai/chat")) {
    await fillBodyProfile(page);
  }
  await expect(page.getByRole("heading", { name: "Tư vấn outfit AI" })).toBeVisible({
    timeout: 15_000,
  });

  // Vibe quiz sets starter-outfits pending — prefer those; fall back to sending a prompt.
  return waitForExpandedOutfitResult(page);
}

export async function ensureSessionViaHome(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Bắt đầu tư vấn outfit" }).first().click();
  await page.waitForURL(/\/ai\/(start|body-profile|vibe-quiz|chat)/);
}
