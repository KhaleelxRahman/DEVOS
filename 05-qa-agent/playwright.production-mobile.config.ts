import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests-live",
  testMatch: ["prod-mobile-375-414.spec.ts"],
  timeout: 240000,
  retries: 0,
  workers: 1,
  use: { browserName: "chromium", actionTimeout: 30000, navigationTimeout: 60000 },
  reporter: [["line"]],
  outputDir: "./test-results/prod-mobile-375-414-run",
});
