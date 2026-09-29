import { defineConfig, devices } from "@playwright/test";

/**
 * Phase 7 — Mobile / Device Experience.
 *
 * Four real mobile viewports (320/375/390/414), a fresh browser context each,
 * walking LOGIN -> PROJECTS -> REAL PROJECT -> ACTIVE WORKSPACE and every
 * workspace surface. Requires the local dev stack:
 *   backend  http://127.0.0.1:8000
 *   frontend http://localhost:5173
 *
 * Run: npm exec --prefix frontend -- playwright test --config=../qa/playwright.phase7-mobile.config.ts
 */
export default defineConfig({
  testDir: "./tests-live",
  testMatch: /phase7-mobile\.spec\.ts$/,
  // Four viewports x a full flow with real subprocesses (terminal, npm,
  // preview) is slow by nature; this is a per-test ceiling, not a target.
  timeout: 1_500_000,
  expect: { timeout: 20_000 },
  workers: 1,
  fullyParallel: false,
  retries: 0,
  outputDir: "test-results/phase7-mobile",
  use: {
    baseURL: "http://localhost:5173",
    headless: true,
    actionTimeout: 25_000,
    navigationTimeout: 60_000,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "off",
  },
  projects: [{ name: "chromium-mobile", use: { ...devices["Desktop Chrome"] } }],
  reporter: [["line"]],
});
