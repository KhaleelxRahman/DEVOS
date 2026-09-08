import { defineConfig, devices } from "@playwright/test";

// Focused Mobile Explorer + Monaco config (Phase 0).
// Requires local dev stack: frontend @5173, backend @8000.
export default defineConfig({
  testDir: "./tests-live",
  testMatch: /mobile\.spec\.ts$/,
  timeout: 600_000,
  expect: { timeout: 20_000 },
  workers: 1,
  fullyParallel: false,
  retries: 0,
  outputDir: "test-results/mobile-run",
  use: {
    headless: true,
    actionTimeout: 30_000,
    navigationTimeout: 60_000,
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  reporter: [["line"]],
});