/**
 * Phase 10 C2 - auto-save honesty (real auto-save, cross-tab isolation, and
 * failed-save honesty).
 *
 * Drives the REAL application against the REAL backend. Requires the local
 * dev stack:
 *   backend  http://127.0.0.1:8000
 *   frontend http://localhost:5173
 *
 * Run: cd qa && npx playwright test --config=playwright.c2-autosave.config.ts
 *
 * NOTE: run this from the `qa` directory, same as the other live configs.
 */
import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests-live",
  testMatch: /c2-autosave\.spec\.ts$/,
  timeout: 180_000,
  expect: { timeout: 20_000 },
  workers: 1,
  fullyParallel: false,
  retries: 0,
  outputDir: "test-results/c2-autosave",
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