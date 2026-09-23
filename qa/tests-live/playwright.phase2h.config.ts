import { defineConfig } from "@playwright/test";

/** Phase 2H — production certification config (real Chromium against production). */
export default defineConfig({
  testDir: __dirname,
  testMatch: ["prod-phase2h-cert.spec.ts"],
  timeout: 420000,
  retries: 1,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "https://devos-ebon.vercel.app",
    headless: true,
    screenshot: "only-on-failure",
    video: "off",
    actionTimeout: 30000,
    navigationTimeout: 90000,
    ignoreHTTPSErrors: true,
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
