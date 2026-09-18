import { defineConfig, devices } from "@playwright/test";

// Read-only production QA audit config. Drives a real Chromium browser against
// the deployed app. actionTimeout/navigationTimeout are bounded so no single
// UI interaction can hang the run; every check records PASS/FAIL/UNVERIFIED.
export default defineConfig({
  testDir: "./tests-live",
  testMatch: /audit\.spec\.ts$/,
  timeout: 1_800_000,
  expect: { timeout: 20_000 },
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  use: {
    headless: true,
    baseURL: "https://devos-ebon.vercel.app",
    viewport: { width: 1440, height: 900 },
    actionTimeout: 20_000,
    navigationTimeout: 60_000,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "off",
    contextOptions: {
      permissions: ["clipboard-read", "clipboard-write"],
      ignoreHTTPSErrors: false,
    },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  reporter: [["line"]],
});