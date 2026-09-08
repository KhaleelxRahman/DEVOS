import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests-live",
  testMatch: /airetry\.spec\.ts$/,
  timeout: 300_000,
  expect: { timeout: 20_000 },
  workers: 1,
  retries: 0,
  outputDir: "test-results/airetry-run",
  use: {
    headless: true,
    baseURL: "http://localhost:5173",
    actionTimeout: 20_000,
    navigationTimeout: 60_000,
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [{ name: "chromium", use: {} }],
  reporter: [["line"]],
});