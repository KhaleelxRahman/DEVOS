import { defineConfig, devices } from "@playwright/test";

// Focused Phase 1 builder production config. Drives a real Chromium browser
// against the deployed frontend + backend and verifies the complete builder
// workflow (classify → plan → start → real stream → apply → Monaco) with
// network evidence for every step.
export default defineConfig({
  testDir: "./tests-live",
  testMatch: /prod-phase1-builder\.spec\.ts$/,
  timeout: 600_000,
  expect: { timeout: 30_000 },
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  use: {
    headless: true,
    baseURL: "https://devos-ebon.vercel.app",
    viewport: { width: 1440, height: 900 },
    actionTimeout: 30_000,
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
