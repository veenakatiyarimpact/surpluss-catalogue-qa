import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright tests live in `tests/uiTests/` and `e2e/`. The app must be running at
 * http://localhost:3001 — `webServer` below starts it for you, or set
 * PLAYWRIGHT_SKIP_WEBSERVER=1 and run `npm run dev` in another terminal.
 */
export default defineConfig({
  testDir: "tests",
  // testMatch: [
  //   "tests/uiTests/**/*.spec.js",
  //   "e2e/**/*.spec.js",
  //   "e2e/**/*.spec.ts",
  //   "e2e/**/*.spec.tsx",
  // ],
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
   reporter: [['html'],['list'],['allure-playwright']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3001",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3001/login",
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
});
