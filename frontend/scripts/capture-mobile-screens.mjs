import { chromium, devices } from "@playwright/test";
import { mkdir } from "fs/promises";
import path from "path";

const OUT = path.resolve("test-results/mobile-screens");
const BASE = process.env.BASE_URL || "http://localhost:3000";

const pages = [
  { name: "01-home", url: "/" },
  { name: "02-discover", url: "/discover" },
  { name: "03-discover-filter", url: "/discover", action: "filter" },
  { name: "04-ai-start", url: "/ai/start" },
  { name: "05-try-on", url: "/try-on" },
  { name: "06-profile-guest", url: "/profile" },
  { name: "07-auth-login", url: "/auth/login" },
  { name: "08-ai-wizard", url: "/ai/body-profile" },
];

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  ...devices["iPhone 13"],
});
const page = await context.newPage();

for (const item of pages) {
  await page.goto(`${BASE}${item.url}`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.waitForTimeout(800);
  if (item.action === "filter") {
    const btn = page.getByRole("button", { name: "Bộ lọc" });
    if (await btn.isVisible().catch(() => false)) {
      await btn.click();
      await page.waitForTimeout(400);
    }
  }
  await page.screenshot({
    path: path.join(OUT, `${item.name}.png`),
    fullPage: item.action !== "filter",
  });
  console.log(`saved ${item.name}.png`);
}

await browser.close();
console.log(`Screenshots: ${OUT}`);
