import { defineConfig } from "@playwright/test";

// PHASE 0.4/0.5 — auth + session + sign-in performance (fresh production).
export default defineConfig({
  testDir: "./tests-live",
  testMatch: ["prod-auth-session-phase0.spec.ts"],
  timeout: 600_000,
  retries: 0,
  workers: 1,
  use: {
    browserName: "chromium",
    headless: true,
    actionTimeout: 60_000,
    navigationTimeout: 120_000,
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  reporter: [["line"]],
  outputDir: "./test-results/phase0-auth-run",
});