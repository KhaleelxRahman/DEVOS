import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests-live",
  testMatch: ["prod-mobile320.spec.ts"],
  timeout: 300000,
  retries: 0,
  workers: 1,
  use: { browserName: "chromium", actionTimeout: 30000, navigationTimeout: 60000 },
  reporter: [["line"]],
  outputDir: "./test-results/prod-mobile320-run",
});
