import { defineConfig, devices } from "@playwright/test";

// Headless live production QA config. Runs a real Chromium browser against
// the deployed https://devos-ebon.vercel.app frontend and the deployed
// https://devos-backend-f3ub.onrender.com backend.
export default defineConfig({
  testDir: "./tests-live",
  timeout: 900_000,
  expect: { timeout: 25_000 },
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  use: {
    headless: true,
    baseURL: "https://devos-ebon.vercel.app",
    viewport: { width: 1440, height: 900 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "off",
    contextOptions: {
      permissions: ["clipboard-read", "clipboard-write"],
      ignoreHTTPSErrors: false,
    },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  reporter: [["list"]],
});