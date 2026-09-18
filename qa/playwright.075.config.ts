import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests-live",
  testMatch: ["prod-github-oauth-075.spec.ts"],
  timeout: 480000,
  retries: 0,
  workers: 1,
  use: { browserName: "chromium", actionTimeout: 60000, navigationTimeout: 120000, headless: true },
  reporter: [["line"]],
  outputDir: "./test-results/075-run",
});