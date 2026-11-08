import { defineConfig, devices } from "@playwright/test";

/**
 * Phase 10 A2 - mid-session 401 auth recovery.
 *
 * Drives the real application against the real backend. Requires the local
 * dev stack:
 *   backend  http://127.0.0.1:8000
 *   frontend http://localhost:5173
 *
 * Run: cd qa && npx playwright test --config=playwright.a2-session.config.ts
 *
 * NOTE: run this from the `qa` directory. Invoking it from `frontend` resolves
 * a second copy of @playwright/test through the shared config path and fails
 * with "Playwright Test did not expect test.beforeAll() to be called here",
 * which is a module-resolution artefact, not a product defect.
 */
export default defineConfig({
  testDir: "./tests-live",
  testMatch: /a2-session-recovery\.spec\.ts$/,
  timeout: 180_000,
  expect: { timeout: 20_000 },
  workers: 1,
  fullyParallel: false,
  retries: 0,
  outputDir: "test-results/a2-session",
  use: {
    baseURL: "http://localhost:5173",
    headless: true,
    actionTimeout: 25_000,
    navigationTimeout: 60_000,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "off",
  },
  projects: [{ name: "chromium-desktop", use: { ...devices["Desktop Chrome"] } }],
  reporter: [["line"]],
});