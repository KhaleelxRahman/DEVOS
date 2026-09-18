import { defineConfig } from "@playwright/test";

// PHASE 0 FAIL reproduction diagnostics (temporary suite member).
export default defineConfig({
  testDir: "./tests-live",
  testMatch: ["prod-phase0-repro.spec.ts"],
  timeout: 600_000,
  retries: 0,
  workers: 1,
  use: { browserName: "chromium", headless: true, actionTimeout: 60_000, navigationTimeout: 120_000 },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  reporter: [["line"]],
  outputDir: "./test-results/phase0-repro-run",
});