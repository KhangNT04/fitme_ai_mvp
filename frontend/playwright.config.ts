import { defineConfig, devices } from "@playwright/test";

/**
 * E2E tests assume the Next.js app is reachable at baseURL.
 * Start the dev server manually, or set PLAYWRIGHT_START_SERVER=1 to auto-start.
 *
 *   npm run dev          # terminal 1
 *   npm run test:e2e     # terminal 2
 */
const startServer = process.env.PLAYWRIGHT_START_SERVER === "1";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 3,
  timeout: 60_000,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /mobile-nav\.spec\.ts/,
    },
    {
      name: "mobile-chrome",
      use: {
        browserName: "chromium",
        ...devices["iPhone 13"],
      },
      testMatch: /mobile-nav\.spec\.ts/,
    },
  ],
  ...(startServer
    ? {
        webServer: {
          command: "npm run dev",
          url: "http://localhost:3000",
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
      }
    : {}),
});
