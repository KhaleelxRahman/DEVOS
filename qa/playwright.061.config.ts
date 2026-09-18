import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests-live",
  testMatch: ["prod-mobile-375-414.spec.ts"],
  timeout: 420000,
  retries: 0,
  workers: 1,
  use: { browserName: "chromium", actionTimeout: 60000, navigationTimeout: 180000, headless: true },
  reporter: [["line"]],
  outputDir: "./test-results/061-run",
});