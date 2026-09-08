import { defineConfig, devices } from "@playwright/test";

// Local regression config (Phase 0). Requires the local dev stack:
//   cd 03-backend && python -m uvicorn app.main:app --port 8000
//   npm --prefix 02-frontend run dev
// Run: npm exec -- playwright test --config="playwright.local.config.ts"
export default defineConfig({
  testDir: "./tests-live",
  testMatch: /local-regression\.spec\.ts$/,
  timeout: 600_000,
  expect: { timeout: 20_000 },
  workers: 1,
  fullyParallel: false,
  retries: 0,
  // Isolated output dir so this run never wipes other suites' artifacts
  // (Playwright clears its outputDir at startup).
  outputDir: "test-results/local-regression-run",
  use: {
    headless: true,
    baseURL: "http://localhost:5173",
    viewport: { width: 1440, height: 900 },
    actionTimeout: 20_000,
    navigationTimeout: 60_000,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "off",
    contextOptions: {
      permissions: ["clipboard-read", "clipboard-write"],
    },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  reporter: [["line"]],
});