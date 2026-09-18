import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests-live",
  testMatch: /diag\.spec\.ts$/,
  timeout: 600_000,
  expect: { timeout: 20_000 },
  workers: 1,
  use: {
    headless: true,
    baseURL: "https://devos-ebon.vercel.app",
    actionTimeout: 20_000,
    navigationTimeout: 60_000,
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  reporter: [["line"]],
});
