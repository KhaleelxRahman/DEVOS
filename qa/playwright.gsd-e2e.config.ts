import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests-live",
  testMatch: /(a2-session-recovery|c2-autosave|login-and-workflows-gsd|todo-application-e2e)\.spec\.ts$/,
  timeout: 180_000,
  expect: { timeout: 20_000 },
  workers: 1,
  fullyParallel: false,
  retries: 0,
  outputDir: "test-results/gsd-e2e",
  use: {
    baseURL: "http://localhost:5173",
    headless: true,
    channel: "chrome",
    actionTimeout: 25_000,
    navigationTimeout: 60_000,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "off",
  },
  projects: [{ name: "chromium-desktop", use: { ...devices["Desktop Chrome"], channel: "chrome" } }],
  reporter: [["list"]],
});
